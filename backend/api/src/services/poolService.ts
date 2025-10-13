import { Prisma } from "@prisma/client";

import type { GraphQLContext } from "../context";
import type { LpPositionDTO, PoolDTO, PoolMetricsDTO } from "../graphql/types";
import { assetSelect, formatAsset } from "./assetService";
import { normalizeAddress } from "../utils/address";
import { decimalToString, toStringSafe } from "../utils/number";

const poolInclude = {
  asset: { select: assetSelect },
  metrics: true
} as const;

type PoolWithRelations = Prisma.PoolGetPayload<{ include: typeof poolInclude }>;

const lpShareInclude = {
  pool: {
    include: poolInclude
  }
} as const;

type LpShareWithRelations = Prisma.LPShareGetPayload<{ include: typeof lpShareInclude }>;

export async function listPools(ctx: GraphQLContext): Promise<PoolDTO[]> {
  const records = await ctx.prisma.pool.findMany({
    include: poolInclude,
    orderBy: { createdAt: "asc" }
  });
  return records.map((record) => formatPool(record));
}

export async function getPool(ctx: GraphQLContext, id: string): Promise<PoolDTO | null> {
  const normalizedId = normalizeAddress(id);
  const record = await ctx.prisma.pool.findUnique({
    where: { id: normalizedId },
    include: poolInclude
  });
  return record ? formatPool(record) : null;
}

export async function listLpPositions(ctx: GraphQLContext, userAddress: string): Promise<LpPositionDTO[]> {
  const normalizedUser = normalizeAddress(userAddress);
  const shares = await ctx.prisma.lPShare.findMany({
    where: { userAddress: normalizedUser },
    include: lpShareInclude
  });

  return shares
    .map((share) => formatLpPosition(share))
    .filter((item): item is LpPositionDTO => item !== null);
}

function formatPool(pool: PoolWithRelations): PoolDTO {
  return {
    id: pool.id,
    asset: formatAsset(pool.asset ?? null, pool.assetId),
    tvlWad: toStringSafe(pool.tvlWad ?? 0n),
    utilization: decimalToString(pool.utilization),
    apy: decimalToString(pool.apy),
    totalShares: toStringSafe(pool.totalShares ?? 0n),
    createdAt: pool.createdAt ? pool.createdAt.toISOString() : null,
    updatedAt: pool.updatedAt ? pool.updatedAt.toISOString() : null,
    metrics: formatPoolMetrics(pool.metrics ?? null)
  };
}

function formatPoolMetrics(metrics: PoolWithRelations["metrics"]): PoolMetricsDTO | null {
  if (!metrics) return null;
  return {
    hedgeReserveWad: toStringSafe(metrics.hedgeReserveWad ?? 0n),
    protocolFeesWad: toStringSafe(metrics.protocolFeesWad ?? 0n),
    lastRebalanceAt: metrics.lastRebalanceAt ? metrics.lastRebalanceAt.toISOString() : null,
    updatedAt: metrics.updatedAt ? metrics.updatedAt.toISOString() : null
  };
}

function formatLpPosition(share: LpShareWithRelations): LpPositionDTO | null {
  if (!share.pool) return null;
  return {
    pool: formatPool(share.pool),
    userAddress: normalizeAddress(share.userAddress),
    shares: toStringSafe(share.shares ?? 0n),
    entryTvlWad: toStringSafe(share.entryTvlWad ?? 0n),
    createdAt: share.createdAt ? share.createdAt.toISOString() : null,
    updatedAt: share.updatedAt ? share.updatedAt.toISOString() : null
  };
}
