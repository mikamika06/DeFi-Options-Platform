import "dotenv/config";

import { Job, Worker } from "bullmq";
import pino from "pino";

import { MARGIN_CHECK_QUEUE } from "./queues";
import { redisOptions } from "./lib/redis";
import { provider, sdk } from "../api/src/sdk";
import { enqueueLiquidation } from "../api/src/services/liquidationQueueService";
import { getKeeperCollateralManager } from "../api/src/services/keeperService";

const logger = pino({ name: "margin-worker" });

export type MarginJob = {
  account: string;
  seriesId?: string | null;
  size?: string | null;
  receiver?: string | null;
};

async function processJob(job: Job<MarginJob>) {
  const { account, seriesId, size, receiver } = job.data;
  logger.info({ account, jobId: job.id }, "Evaluating margin");

  const keeperCollateralManager = getKeeperCollateralManager();
  const readCollateralManager = sdk.collateralManager.connect(provider);
  try {
    const tx = await (keeperCollateralManager as any).evaluateAccount(account);
    await tx.wait();
  } catch (error) {
    logger.error({ account, error }, "evaluateAccount call failed");
    throw error;
  }

  const status = await (readCollateralManager as any).getAccountStatus(account);
  const inLiquidation: boolean = status.inLiquidation ?? false;
  const equity = status.equity?.toString?.() ?? "0";
  const maintenance = status.maintenance?.toString?.() ?? "0";

  logger.info({ account, inLiquidation, equity, maintenance }, "Margin status");

  if (inLiquidation && seriesId && size) {
    logger.info({ account, seriesId, size }, "Account flagged for liquidation, enqueuing job");
    await enqueueLiquidation(seriesId, account, size, receiver ?? null);
  }

  return { inLiquidation, equity, maintenance };
}

new Worker<MarginJob>(
  MARGIN_CHECK_QUEUE,
  async (job) => {
    try {
      return await processJob(job);
    } catch (error) {
      logger.error({ jobId: job.id, error }, "Margin job failed");
      throw error;
    }
  },
  { connection: redisOptions }
);

logger.info("Margin worker started");
