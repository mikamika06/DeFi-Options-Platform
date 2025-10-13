import "dotenv/config";

import { Job, Worker } from "bullmq";
import pino from "pino";

import { LIQUIDATION_QUEUE } from "./queues";
import { redisOptions } from "./lib/redis";
import { executeLiquidation } from "../api/src/services/liquidationService";

const logger = pino({ name: "liquidation-worker" });

type LiquidationJob = {
  seriesId: string;
  account: string;
  size: string;
  receiver?: string | null;
};

async function processJob(job: Job<LiquidationJob>) {
  const { seriesId, account, size, receiver } = job.data;
  logger.info({ seriesId, account, size, jobId: job.id }, "Processing liquidation job");
  const txHash = await executeLiquidation(seriesId, account, size, receiver ?? null);
  logger.info({ seriesId, account, size, txHash }, "Liquidation executed");
  return { txHash };
}

new Worker<LiquidationJob>(
  LIQUIDATION_QUEUE,
  async (job) => {
    try {
      return await processJob(job);
    } catch (error) {
      logger.error({ jobId: job.id, error }, "Liquidation job failed");
      throw error;
    }
  },
  { connection: redisOptions }
);

logger.info("Liquidation worker started");
