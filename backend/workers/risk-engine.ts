import "dotenv/config";

import { Job, Worker } from "bullmq";
import { ethers } from "ethers";
import pino from "pino";

import { prisma } from "../api/src/prisma";
import { RISK_RECALC_QUEUE } from "./queues";
import { redisOptions } from "./lib/redis";
import { listPositions } from "../api/src/services/positionService";
import type { GraphQLContext } from "../api/src/context";
import { sdk, provider } from "../api/src/sdk";
import { blackScholes } from "../api/src/utils/greeks";
import { enqueueGreeks } from "../api/src/services/greeksQueueService";
import { enqueueMarginCheck } from "../api/src/services/marginQueueService";

const logger = pino({ name: "risk-engine" });

const context: GraphQLContext = {
  prisma,
  provider,
  sdk,
  request: {} as any,
  roles: new Set()
};

type RiskJob = {
  userAddress: string;
};

const SECONDS_IN_YEAR = 365 * 24 * 60 * 60;

async function fetchSeriesData(seriesId: string) {
  const state = await sdk.optionsMarket.getSeries(seriesId);
  const config = state.config;
  const [spotRaw, spotDecimals] = await sdk.oracleRouter.spot(config.underlying);
  const spot = Number(ethers.formatUnits(spotRaw, spotDecimals));
  const strike = Number(ethers.formatUnits(config.strike, 18));
  const ivValue = await sdk.ivOracle.iv(seriesId);
  const iv = Number(ethers.formatUnits(ivValue, 18));
  const expiry = Number(config.expiry);

  return {
    spot,
    strike,
    iv,
    expiry,
    isCall: Boolean(config.isCall)
  };
}

function toDecimalString(value: number): string | null {
  if (!Number.isFinite(value) || Math.abs(value) < 1e-12) {
    return null;
  }
  return value.toString();
}

async function processJob(data: RiskJob) {
  const user = data.userAddress;
  logger.info({ user }, "Processing risk job");

  const positions = await listPositions(context, { userAddress: user });
  if (!positions.length) {
    await prisma.riskSnapshot.create({
      data: {
        userAddress: user,
        seriesId: null,
        netDelta: null,
        netGamma: null,
        netVega: null,
        marginRequiredWad: 0n,
        marginAvailableWad: 0n,
        liquidationPrice: null,
        alertLevel: "INFO"
      }
    });
    logger.info({ user }, "Risk snapshot stored (no positions)");
    return;
  }

  const seriesCache = new Map<string, Awaited<ReturnType<typeof fetchSeriesData>>>();
  const uniqueSeries = new Set<string>();

  let netDelta = 0;
  let netGamma = 0;
  let netVega = 0;
  let netTheta = 0;
  let netRho = 0;
  let marginRequirementUsd = 0;

  let dominantSeriesId: string | null = null;
  let dominantSizeWad = 0n;

  const nowSeconds = Math.floor(Date.now() / 1000);

  for (const position of positions) {
    const seriesId = position.seriesId.toLowerCase();
    uniqueSeries.add(seriesId);
    const sizeWad = BigInt(position.sizeWad);
    if (sizeWad === 0n) continue;

    let seriesData = seriesCache.get(seriesId);
    if (!seriesData) {
      seriesData = await fetchSeriesData(seriesId);
      seriesCache.set(seriesId, seriesData);
    }

    if (seriesData.spot <= 0 || seriesData.strike <= 0 || seriesData.iv <= 0) {
      continue;
    }

    const timeToExpirySeconds = Math.max(seriesData.expiry - nowSeconds, 0);
    if (timeToExpirySeconds === 0) continue;

    const timeYears = timeToExpirySeconds / SECONDS_IN_YEAR;

    const greeks = blackScholes({
      isCall: seriesData.isCall,
      spot: seriesData.spot,
      strike: seriesData.strike,
      time: timeYears,
      volatility: seriesData.iv
    });

    const quantity = Number(ethers.formatUnits(sizeWad, 18));
    if (!Number.isFinite(quantity) || quantity === 0) continue;

    const direction = position.positionType === "SHORT" ? -1 : 1;

    netDelta += direction * quantity * greeks.delta;
    netGamma += direction * quantity * greeks.gamma;
    netVega += direction * quantity * greeks.vega;
    netTheta += direction * quantity * greeks.theta;
    netRho += direction * quantity * greeks.rho;

    const deltaUsd = Math.abs(quantity * greeks.delta * seriesData.spot);
    const vegaUsd = Math.abs(quantity * greeks.vega * 0.01);
    marginRequirementUsd += deltaUsd + vegaUsd;

    const absSizeWad = sizeWad < 0n ? -sizeWad : sizeWad;
    if (absSizeWad > dominantSizeWad) {
      dominantSeriesId = seriesId;
      dominantSizeWad = absSizeWad;
    }
  }

  const alertLevel = marginRequirementUsd > 20_000 ? "CRITICAL" : marginRequirementUsd > 5_000 ? "WARNING" : "INFO";
  const marginRequiredWad = ethers.parseUnits(marginRequirementUsd.toFixed(6), 18);

  await prisma.riskSnapshot.create({
    data: {
      userAddress: user,
      seriesId: dominantSeriesId,
      netDelta: toDecimalString(netDelta),
      netGamma: toDecimalString(netGamma),
      netVega: toDecimalString(netVega),
      marginRequiredWad,
      marginAvailableWad: marginRequiredWad,
      liquidationPrice: null,
      alertLevel
    }
  });

  logger.info({ user, netDelta, netGamma, netVega, marginRequirementUsd }, "Risk snapshot stored");

  await Promise.all([
    ...Array.from(uniqueSeries).map((seriesId) => enqueueGreeks(seriesId)),
    enqueueMarginCheck({
      account: user,
      seriesId: dominantSeriesId,
      size: dominantSizeWad > 0n ? dominantSizeWad.toString() : null,
      receiver: null
    })
  ]);
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
