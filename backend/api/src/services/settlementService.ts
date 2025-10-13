import { ZERO_ADDRESS } from "../utils/constants";
import { parseBigIntStrict } from "../utils/number";
import { prisma } from "../prisma";
import { sdk } from "../sdk";
import { getKeeperOptionsMarket, getKeeperSigner } from "./keeperService";
import { ethers } from "ethers";

export async function executeSettleSeries(seriesId: string, residualRecipient?: string | null): Promise<string> {
  if (!seriesId) throw new Error("seriesId is required");
  const normalizedId = normalizeSeriesId(seriesId);
  const recipient = residualRecipient ? residualRecipient.toLowerCase() : undefined;
  const contract = getKeeperOptionsMarket();
  const tx = await (contract as any).settleSeries(normalizedId, recipient ?? ZERO_ADDRESS);
  const receipt = await tx.wait();

  await recordSettlement(normalizedId, receipt);

  return receipt?.hash ?? tx.hash;
}

export function normalizeSeriesId(seriesId: string): string {
  const value = seriesId.toLowerCase();
  if (!value.startsWith("0x") || value.length !== 66) {
    throw new Error("seriesId must be 32-byte hex string");
  }
  return value;
}

export function parseBigInt(value: string, field: string): bigint {
  return parseBigIntStrict(value, field);
}

async function recordSettlement(seriesId: string, receipt: ethers.TransactionReceipt | null) {
  if (!receipt) return;

  const keeper = getKeeperSigner();

  let residual = 0n;
  let settlementHarvested = 0n;
  let insurancePremium = 0n;

  for (const log of receipt.logs) {
    try {
      if (log.address.toLowerCase() === (sdk.optionsMarket.target as string).toLowerCase()) {
        const parsed = sdk.optionsMarket.interface.parseLog(log);
        if (parsed && parsed.name === "SeriesResidualSwept") {
          residual += parsed.args.amount as bigint;
        }
      } else if (log.address.toLowerCase() === (sdk.liquidityVault.target as string).toLowerCase()) {
        try {
          const parsed = sdk.liquidityVault.interface.parseLog(log);
          if (parsed && parsed.name === "SettlementHarvested") {
            settlementHarvested += parsed.args.amount as bigint;
          }
        } catch {}
      } else if (log.address.toLowerCase() === (sdk.insuranceFund.target as string).toLowerCase()) {
        try {
          const parsed = sdk.insuranceFund.interface.parseLog(log);
          if (parsed && parsed.name === "PremiumNotified") {
            insurancePremium += parsed.args.amount as bigint;
          }
        } catch {}
      }
    } catch (error) {
      // ignore unrecognized logs
    }
  }

  await prisma.settlement.upsert({
    where: { seriesId },
    update: {
      residualPremiumWad: residual,
      payoutTotalWad: settlementHarvested,
      executedBy: keeper.address.toLowerCase(),
      executedAt: new Date()
    },
    create: {
      seriesId,
      settlementPriceWad: 0n,
      payoutTotalWad: settlementHarvested,
      residualPremiumWad: residual,
      executedBy: keeper.address.toLowerCase()
    }
  });

  if (insurancePremium > 0n) {
    await prisma.insuranceFlow.create({
      data: {
        source: "settlement",
        amountWad: insurancePremium,
        seriesId,
        txHash: receipt.hash
      }
    });
  }
}
