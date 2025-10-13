import "dotenv/config";

import { Job, Worker } from "bullmq";
import { ethers } from "ethers";
import pino from "pino";

import { GREEKS_QUEUE } from "./queues";
import { redisOptions } from "./lib/redis";
import { prisma } from "../api/src/prisma";
import { sdk } from "../api/src/sdk";
import { blackScholes } from "../api/src/utils/greeks";

const logger = pino({ name: "greeks-worker" });

const SECONDS_IN_YEAR = 365 * 24 * 60 * 60;

type GreeksJob = {
  seriesId: string;
};

async function fetchSeriesSnapshot(seriesId: string) {
  const state = await sdk.optionsMarket.getSeries(seriesId);
  const config = state.config;

  const [spotRaw, spotDecimals] = await sdk.oracleRouter.spot(config.underlying);
  const spot = Number(ethers.formatUnits(spotRaw, spotDecimals));
  const strike = Number(ethers.formatUnits(config.strike, 18));
  const ivValue = await sdk.ivOracle.iv(seriesId);
  const iv = Number(ethers.formatUnits(ivValue, 18));
  const expiry = Number(config.expiry);
  const isCall = Boolean(config.isCall);

  return { spot, strike, iv, expiry, isCall };
}

async function processJob(job: Job<GreeksJob>) {
  const seriesId = job.data.seriesId.toLowerCase();
  logger.info({ seriesId, jobId: job.id }, "Computing greeks");

  const snapshot = await fetchSeriesSnapshot(seriesId);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const timeSeconds = Math.max(snapshot.expiry - nowSeconds, 0);
  if (timeSeconds === 0) {
    logger.warn({ seriesId }, "Series expired; skipping greeks update");
    return null;
  }
  if (snapshot.spot <= 0 || snapshot.strike <= 0 || snapshot.iv <= 0) {
    logger.warn({ seriesId }, "Invalid market data for greeks");
    return null;
  }

  const timeYears = timeSeconds / SECONDS_IN_YEAR;
  const greeks = blackScholes({
    isCall: snapshot.isCall,
    spot: snapshot.spot,
    strike: snapshot.strike,
    time: timeYears,
    volatility: snapshot.iv,
    rate: 0
  });

  await prisma.seriesMetric.upsert({
    where: { seriesId },
    update: {
      markIv: snapshot.iv.toString(),
      markDelta: greeks.delta.toString(),
      markGamma: greeks.gamma.toString(),
      markVega: greeks.vega.toString(),
      markTheta: greeks.theta.toString(),
      markRho: greeks.rho.toString(),
      lastQuoteAt: new Date(),
      updatedAt: new Date()
    },
    create: {
      seriesId,
      markIv: snapshot.iv.toString(),
      markDelta: greeks.delta.toString(),
      markGamma: greeks.gamma.toString(),
      markVega: greeks.vega.toString(),
      markTheta: greeks.theta.toString(),
      markRho: greeks.rho.toString(),
      lastQuoteAt: new Date()
    }
  });

  logger.info({ seriesId, greeks }, "Greeks updated");
  return greeks;
}

new Worker<GreeksJob>(
  GREEKS_QUEUE,
  async (job) => {
    try {
      return await processJob(job);
    } catch (error) {
      logger.error({ jobId: job.id, error }, "Greeks job failed");
      throw error;
    }
  },
  { connection: redisOptions }
);

logger.info("Greeks worker started");
