import "dotenv/config";

import { ethers } from "ethers";
import pino from "pino";

import { prisma } from "../api/src/prisma";
import { sdk, rpcUrl } from "../api/src/sdk";

const logger = pino({ name: "event-indexer" });

const providerUrl = process.env.INDEXER_RPC_URL ?? rpcUrl;
const provider = new ethers.JsonRpcProvider(providerUrl);
const prismaClient = prisma as any;

const optionsMarketAddress = (sdk.optionsMarket.target as string).toLowerCase();
const optionTokenAddress = (sdk.optionToken.target as string).toLowerCase();
const iface = sdk.optionsMarket.interface;
const optionTokenIface = sdk.optionToken.interface;
const BATCH_SIZE = 1000;
const STATE_ID = "options_market";
const POLL_INTERVAL_MS = Number(process.env.INDEXER_POLL_INTERVAL ?? 15000);
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function getLastProcessedBlock(): Promise<number> {
  const state = await prismaClient.indexerState.findUnique({
    where: { id: STATE_ID },
  });
  if (state) return state.lastBlock;
  const latest = await provider.getBlockNumber();
  await prismaClient.indexerState.create({
    data: { id: STATE_ID, lastBlock: latest },
  });
  return latest;
}

async function setLastProcessedBlock(block: number) {
  await prismaClient.indexerState.upsert({
    where: { id: STATE_ID },
    update: { lastBlock: block },
    create: { id: STATE_ID, lastBlock: block },
  });
}

/**
 * Helper function to handle position transfers
 * Updates position sizes when tokens are transferred between addresses
 */
async function handlePositionTransfer(
  from: string,
  to: string,
  seriesId: string,
  amount: bigint,
  timestamp: Date
) {
  const fromAddress = from.toLowerCase();
  const toAddress = to.toLowerCase();
  const normalizedSeriesId = seriesId.toLowerCase();

  // Skip if this is a mint (from zero address) or burn (to zero address)
  // These are handled by other events (TradeExecuted, PositionLiquidated, etc.)
  if (fromAddress === ZERO_ADDRESS || toAddress === ZERO_ADDRESS) {
    return;
  }

  await prismaClient.$transaction(async (tx: any) => {
    // Decrease sender's position
    const fromPosition = await tx.position.findUnique({
      where: {
        userAddress_seriesId_positionType: {
          userAddress: fromAddress,
          seriesId: normalizedSeriesId,
          positionType: "LONG",
        },
      },
    });

    if (fromPosition) {
      const newSize = BigInt(fromPosition.sizeWad.toString()) - amount;
      if (newSize <= 0n) {
        // Delete position if size becomes zero or negative
        await tx.position.delete({
          where: { id: fromPosition.id },
        });
      } else {
        await tx.position.update({
          where: { id: fromPosition.id },
          data: {
            sizeWad: newSize,
            lastUpdated: timestamp,
          },
        });
      }
    }

    // Increase receiver's position
    await tx.position.upsert({
      where: {
        userAddress_seriesId_positionType: {
          userAddress: toAddress,
          seriesId: normalizedSeriesId,
          positionType: "LONG",
        },
      },
      update: {
        sizeWad: { increment: amount },
        lastUpdated: timestamp,
      },
      create: {
        userAddress: toAddress,
        seriesId: normalizedSeriesId,
        positionType: "LONG",
        sizeWad: amount,
        avgPriceWad: 0n,
        pnlUnrealizedWad: 0n,
        pnlRealizedWad: 0n,
        lastUpdated: timestamp,
      },
    });
  });
}

async function processRange(fromBlock: number, toBlock: number) {
  if (fromBlock > toBlock) return;
  logger.info({ fromBlock, toBlock }, "Syncing events");

  // Fetch logs from OptionsMarket
  const marketLogs = await provider.getLogs({
    address: optionsMarketAddress,
    fromBlock,
    toBlock,
  });

  // Fetch logs from OptionToken
  const tokenLogs = await provider.getLogs({
    address: optionTokenAddress,
    fromBlock,
    toBlock,
  });

  const allLogs = [...marketLogs, ...tokenLogs].sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return a.blockNumber - b.blockNumber;
    }
    return a.index - b.index;
  });

  const blockCache = new Map<number, ethers.Block>();

  for (const log of allLogs) {
    try {
      const blockNumber = log.blockNumber ?? 0;
      let block = blockCache.get(blockNumber);
      if (!block) {
        const fetched = await provider.getBlock(blockNumber);
        if (fetched) {
          blockCache.set(blockNumber, fetched);
          block = fetched;
        }
      }
      if (!block) continue;
      const timestamp = new Date(block.timestamp * 1000);

      // Determine which interface to use based on the log address
      const isMarketEvent = log.address.toLowerCase() === optionsMarketAddress;
      const parsed = isMarketEvent
        ? iface.parseLog(log)
        : optionTokenIface.parseLog(log);

      if (!parsed) continue;
      const args = parsed.args as Record<string, any>;

      // Handle OptionToken events
      if (!isMarketEvent) {
        if (parsed.name === "TransferSingle") {
          const from = (args.from as string).toLowerCase();
          const to = (args.to as string).toLowerCase();
          const id = args.id?.toString?.() ?? "";
          const value = BigInt(args.value?.toString?.() ?? "0");

          if (id && value > 0n) {
            await handlePositionTransfer(from, to, id, value, timestamp);
            logger.info(
              { from, to, seriesId: id, value: value.toString() },
              "TransferSingle processed"
            );
          }
        } else if (parsed.name === "TransferBatch") {
          const from = (args.from as string).toLowerCase();
          const to = (args.to as string).toLowerCase();
          const ids = args.ids ?? [];
          const values = args.values ?? [];

          for (let i = 0; i < ids.length; i++) {
            const id = ids[i]?.toString?.() ?? "";
            const value = BigInt(values[i]?.toString?.() ?? "0");

            if (id && value > 0n) {
              await handlePositionTransfer(from, to, id, value, timestamp);
            }
          }
          logger.info(
            { from, to, count: ids.length },
            "TransferBatch processed"
          );
        }
        continue;
      }

      // Handle OptionsMarket events
      const rawSeries = args.id ?? args.seriesId ?? null;
      const seriesId: string = rawSeries
        ? rawSeries.toString().toLowerCase()
        : "";
      if (!seriesId) continue;
      const jobId = `${log.transactionHash}-${log.index}`;

      switch (parsed.name) {
        case "TradeExecuted": {
          await prismaClient.trade.create({
            data: {
              id: jobId,
              seriesId: seriesId,
              userAddress: (args.trader as string).toLowerCase(),
              side: "BUY",
              sizeWad: BigInt(args.size?.toString?.() ?? "0"),
              premiumWad: BigInt(args.premium?.toString?.() ?? "0"),
              feeWad: BigInt(args.fee?.toString?.() ?? "0"),
              txHash: log.transactionHash,
              blockNumber: BigInt(blockNumber),
              timestamp,
            },
          });
          break;
        }
        case "PositionExercised": {
          await prismaClient.marginEvent.create({
            data: {
              userAddress: (args.trader as string).toLowerCase(),
              seriesId,
              eventType: "EXERCISE",
              deltaWad: BigInt(args.size?.toString?.() ?? "0"),
              resultingMarginWad: BigInt(args.payout?.toString?.() ?? "0"),
              metadata: {
                txHash: log.transactionHash,
              },
              timestamp,
            },
          });
          break;
        }
        case "SeriesSettled": {
          await prismaClient.series.updateMany({
            where: { id: seriesId },
            data: { isSettled: true },
          });
          break;
        }
        case "PositionLiquidated": {
          await prismaClient.liquidation.create({
            data: {
              seriesId,
              liquidatedUser: (args.account as string).toLowerCase(),
              initiator: (args.initiator as string).toLowerCase(),
              sizeClosedWad: BigInt(args.size?.toString?.() ?? "0"),
              payoutWad: BigInt(args.payout?.toString?.() ?? "0"),
              penaltyWad: 0n,
              blockNumber: BigInt(blockNumber),
              timestamp,
              txHash: log.transactionHash,
            },
          });
          break;
        }
        default:
          break;
      }
    } catch (error) {
      logger.error({ error }, "Failed to parse log");
    }
  }
}

async function syncOnce() {
  const last = await getLastProcessedBlock();
  const latest = await provider.getBlockNumber();
  if (latest <= last) {
    return;
  }
  let from = last + 1;
  while (from <= latest) {
    const to = Math.min(from + BATCH_SIZE - 1, latest);
    await processRange(from, to);
    await setLastProcessedBlock(to);
    from = to + 1;
  }
}

async function run() {
  await syncOnce();
  setInterval(() => {
    syncOnce().catch((error) => logger.error({ error }, "Indexer sync failed"));
  }, POLL_INTERVAL_MS);
}

run().catch((error) => {
  logger.error({ error }, "Indexer terminated");
  process.exit(1);
});
