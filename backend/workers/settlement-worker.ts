import "dotenv/config";

import { Job, Worker } from "bullmq";
import pino from "pino";

import { SETTLEMENT_QUEUE } from "./queues";
import { redisOptions } from "./lib/redis";
import { executeSettleSeries } from "../api/src/services/settlementService";

const logger = pino({ name: "settlement-worker" });

type SettlementJob = {
  seriesId: string;
  residualRecipient?: string | null;
};

async function processJob(job: Job<SettlementJob>) {
  const { seriesId, residualRecipient } = job.data;
  logger.info({ seriesId, jobId: job.id }, "Processing settlement job");
  const txHash = await executeSettleSeries(seriesId, residualRecipient ?? null);
  logger.info({ seriesId, txHash }, "Settlement executed");
  return { txHash };
}

new Worker<SettlementJob>(
  SETTLEMENT_QUEUE,
  async (job) => {
    try {
      return await processJob(job);
    } catch (error) {
      logger.error({ jobId: job.id, error }, "Settlement job failed");
      throw error;
    }
  },
  { connection: redisOptions }
);

logger.info("Settlement worker started");
