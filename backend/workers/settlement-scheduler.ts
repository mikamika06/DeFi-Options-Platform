import "dotenv/config";

import pino from "pino";

import { sdk } from "../api/src/sdk";
import { enqueueSettlement } from "../api/src/services/settlementQueueService";

const logger = pino({ name: "settlement-scheduler" });

const intervalMs = Number(process.env.SETTLEMENT_POLL_INTERVAL ?? 60000);

async function scanAndSchedule() {
  try {
    const now = Math.floor(Date.now() / 1000);
    const ids: string[] = await sdk.optionsMarket.listSeriesIds();

    for (const id of ids) {
      try {
        const state = await sdk.optionsMarket.getSeries(id);
        const isSettled = Boolean(state.settled);
        const expiry = Number(state.config.expiry);
        const longOI = BigInt(state.longOpenInterest ?? 0n);
        if (!isSettled && expiry !== 0 && expiry <= now && longOI === 0n) {
          await enqueueSettlement(id, null);
          logger.info({ seriesId: id }, "Queued settlement job");
        }
      } catch (error) {
        logger.error({ seriesId: id, error }, "Failed to evaluate series for settlement");
      }
    }
  } catch (error) {
    logger.error({ error }, "Settlement scheduler scan failed");
  }
}

async function run() {
  await scanAndSchedule();
  setInterval(scanAndSchedule, intervalMs);
}

run().catch((error) => {
  logger.error({ error }, "Settlement scheduler terminated");
  process.exit(1);
});
