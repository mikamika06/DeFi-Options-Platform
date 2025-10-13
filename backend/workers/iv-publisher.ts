import "dotenv/config";

import { Job, Worker } from "bullmq";
import pino from "pino";

import { IV_UPDATE_QUEUE } from "./queues";
import { redisOptions } from "./lib/redis";
import { executeIvUpdate } from "../api/src/services/ivService";

const logger = pino({ name: "iv-publisher" });

type IvJob = {
  seriesId: string;
  ivWad: string;
};

async function processJob(job: Job<IvJob>) {
  const { seriesId, ivWad } = job.data;
  logger.info({ seriesId, ivWad, jobId: job.id }, "Processing IV update");
  const txHash = await executeIvUpdate(seriesId, ivWad);
  logger.info({ seriesId, ivWad, txHash }, "IV update executed");
  return { txHash };
}

new Worker<IvJob>(
  IV_UPDATE_QUEUE,
  async (job) => {
    try {
      return await processJob(job);
    } catch (error) {
      logger.error({ jobId: job.id, error }, "IV job failed");
      throw error;
    }
  },
  { connection: redisOptions }
);

logger.info("IV publisher worker started");
