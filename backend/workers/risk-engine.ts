import "dotenv/config";

import { Worker, Job } from "bullmq";
import pino from "pino";

import { prisma } from "../api/src/prisma";
import { RISK_RECALC_QUEUE } from "./queues";
import { redisOptions } from "./lib/redis";
import { listPositions } from "../api/src/services/positionService";
import type { GraphQLContext } from "../api/src/context";
import { sdk, provider } from "../api/src/sdk";

const logger = pino({ name: "risk-engine" });

const context: GraphQLContext = {
  prisma,
  provider,
  sdk
};

type RiskJob = {
  userAddress: string;
};

async function processJob(data: RiskJob) {
  const user = data.userAddress;
  logger.info({ user }, "Processing risk job");

  const positions = await listPositions(context, { userAddress: user });

  let netDelta = 0n;
  let netGamma = 0n;
  let netVega = 0n;
  let marginRequirement = 0n;

  for (const position of positions) {
    const size = BigInt(position.sizeWad);
    netDelta += size;
    netGamma += size / 10n;
    netVega += size / 20n;
    marginRequirement += size > 0n ? size / 2n : 0n;
  }

  await prisma.riskSnapshot.create({
    data: {
      userAddress: user,
      seriesId: positions[0]?.seriesId ?? null,
      netDelta: netDelta === 0n ? null : netDelta.toString(),
      netGamma: netGamma === 0n ? null : netGamma.toString(),
      netVega: netVega === 0n ? null : netVega.toString(),
      marginRequiredWad: marginRequirement,
      marginAvailableWad: marginRequirement,
      liquidationPrice: null,
      alertLevel: "INFO"
    }
  });

  logger.info({ user }, "Risk snapshot stored");
}

const worker = new Worker<RiskJob>(
  RISK_RECALC_QUEUE,
  async (job: Job<RiskJob>) => {
    await processJob(job.data);
  },
  { connection: redisOptions }
);

worker.on("completed", (job: Job<RiskJob>) => {
  logger.debug({ jobId: job.id }, "risk job completed");
});

worker.on("failed", (job: Job<RiskJob> | undefined, err: Error) => {
  logger.error({ jobId: job?.id, err }, "risk job failed");
});

logger.info("Risk engine worker started");
