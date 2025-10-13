import { Prisma, OptionType as PrismaOptionType } from "@prisma/client";

import type { GraphQLContext } from "../context";
import type { AssetDTO, SeriesDTO, SeriesFilterInput, SeriesMetricsDTO } from "../graphql/types";
import { assetSelect, formatAsset } from "./assetService";
import { normalizeAddress } from "../utils/address";
import { parseDateBound, parseTimestampSeconds, secondsToIso } from "../utils/time";
import { decimalToString, toStringSafe } from "../utils/number";
import { UNKNOWN_SYMBOL, ZERO_ADDRESS } from "../utils/constants";

type SeriesWithRelations = Prisma.SeriesGetPayload<{
  include: {
    metric: true;
    underlyingAsset: { select: typeof assetSelect };
    quoteAsset: { select: typeof assetSelect };
  };
}>;

type AssetRecord = Prisma.AssetGetPayload<{ select: typeof assetSelect }>;

export async function listSeries(ctx: GraphQLContext, filter?: SeriesFilterInput | null): Promise<SeriesDTO[]> {
  return resolveSeries(ctx, filter ?? null);
}

export async function getSeriesById(ctx: GraphQLContext, id: string): Promise<SeriesDTO | null> {
  const [series] = await resolveSeries(ctx, null, [id]);
  return series ?? null;
}

export async function getSeriesMap(ctx: GraphQLContext, ids: string[]): Promise<Map<string, SeriesDTO>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) return new Map();
  const seriesList = await resolveSeries(ctx, null, uniqueIds);
  const map = new Map<string, SeriesDTO>();
  for (const item of seriesList) {
    map.set(item.id, item);
  }
  return map;
}

export function buildFallbackSeries(id: string): SeriesDTO {
  return {
    id,
    optionType: "CALL",
    strikeWad: "0",
    expiry: "0",
    baseFeeBps: 0,
    isSettled: false,
    createdAt: null,
    lastIvUpdateAt: null,
    underlying: buildFallbackAsset(id),
    quote: buildFallbackAsset(id),
    longOpenInterest: "0",
    shortOpenInterest: "0",
    totalPremiumCollected: "0",
    metrics: null
  };
}

export function buildFallbackAsset(id: string): AssetDTO {
  return {
    id,
    symbol: UNKNOWN_SYMBOL,
    decimals: 18,
    metadata: null
  };
}

async function resolveSeries(
  ctx: GraphQLContext,
  filter: SeriesFilterInput | null,
  explicitIds?: string[]
): Promise<SeriesDTO[]> {
  const where = buildSeriesWhere(filter);
  if (explicitIds?.length) {
    where.id = { in: explicitIds };
  }

  const dbSeries = await ctx.prisma.series.findMany({
    where,
    include: {
      metric: true,
      underlyingAsset: { select: assetSelect },
      quoteAsset: { select: assetSelect }
    },
    orderBy: { expiry: "asc" }
  });

  const dbMap = new Map<string, SeriesWithRelations>();
  const assetCache = new Map<string, AssetRecord | null>();
  for (const record of dbSeries) {
    dbMap.set(record.id, record);
    if (record.underlyingAsset) assetCache.set(normalizeAddress(record.underlyingAsset.id), record.underlyingAsset);
    if (record.quoteAsset) assetCache.set(normalizeAddress(record.quoteAsset.id), record.quoteAsset);
  }

  const candidateIds = new Set<string>();
  if (explicitIds?.length) {
    explicitIds.forEach((id) => candidateIds.add(id));
  } else {
    dbSeries.forEach((record) => candidateIds.add(record.id));
    const onchainIds: string[] = await ctx.sdk.optionsMarket.listSeriesIds();
    onchainIds.forEach((id) => candidateIds.add(id));
  }

  const results = await Promise.all(
    Array.from(candidateIds).map((id) => buildSeriesPayload(ctx, id, dbMap.get(id), assetCache, filter))
  );

  return results.filter((item): item is SeriesDTO => item !== null).sort(sortSeriesByExpiry);
}

function sortSeriesByExpiry(a: SeriesDTO, b: SeriesDTO) {
  const aNum = Number(a.expiry);
  const bNum = Number(b.expiry);
  if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
    return aNum - bNum;
  }
  return a.expiry.localeCompare(b.expiry);
}

async function buildSeriesPayload(
  ctx: GraphQLContext,
  id: string,
  dbRecord: SeriesWithRelations | undefined,
  assetCache: Map<string, AssetRecord | null>,
  filter: SeriesFilterInput | null
): Promise<SeriesDTO | null> {
  try {
    const state = await ctx.sdk.optionsMarket.getSeries(id);
    const cfg = state.config;

    if (filter && !matchesFilter(filter, cfg)) {
      return null;
    }

    const underlyingId = normalizeAddress(cfg.underlying);
    const quoteId = normalizeAddress(cfg.quote);

    const underlyingAsset = dbRecord?.underlyingAsset ?? (await loadAsset(ctx, assetCache, underlyingId));
    const quoteAsset = dbRecord?.quoteAsset ?? (await loadAsset(ctx, assetCache, quoteId));

    return {
      id,
      optionType: cfg.isCall ? "CALL" : "PUT",
      strikeWad: cfg.strike.toString(),
      expiry: cfg.expiry.toString(),
      baseFeeBps: Number(cfg.baseFeeBps),
      isSettled: Boolean(state.settled ?? dbRecord?.isSettled ?? false),
      createdAt: dbRecord?.createdAt ? dbRecord.createdAt.toISOString() : secondsToIso(state.createdAt),
      lastIvUpdateAt: secondsToIso(state.lastIvUpdate),
      underlying: formatAsset(underlyingAsset, underlyingId),
      quote: formatAsset(quoteAsset, quoteId),
      longOpenInterest: toStringSafe(state.longOpenInterest ?? dbRecord?.longOpenInterest ?? 0n),
      shortOpenInterest: toStringSafe(state.shortOpenInterest ?? dbRecord?.shortOpenInterest ?? 0n),
      totalPremiumCollected: toStringSafe(state.totalPremiumCollected ?? dbRecord?.totalPremiumWad ?? 0n),
      metrics: formatSeriesMetric(dbRecord?.metric ?? null)
    };
  } catch (error) {
    console.warn(`[graphql] Failed to load series ${id}: ${String(error)}`);
    return null;
  }
}

function buildSeriesWhere(filter: SeriesFilterInput | null) {
  if (!filter) return {};
  const where: Prisma.SeriesWhereInput = {};

  if (filter.underlyingId) {
    where.underlyingAssetId = normalizeAddress(filter.underlyingId);
  }
  if (filter.quoteAssetId) {
    where.quoteAssetId = normalizeAddress(filter.quoteAssetId);
  }
  if (filter.optionType) {
    where.optionType = filter.optionType === "CALL" ? PrismaOptionType.CALL : PrismaOptionType.PUT;
  }

  const gte = parseDateBound(filter.expiryFrom);
  const lte = parseDateBound(filter.expiryTo);
  if (gte || lte) {
    where.expiry = {};
    if (gte) where.expiry.gte = gte;
    if (lte) where.expiry.lte = lte;
  }

  return where;
}

function matchesFilter(
  filter: SeriesFilterInput,
  cfg: { underlying: string; quote: string; isCall: boolean; expiry: bigint }
) {
  if (filter.underlyingId && normalizeAddress(cfg.underlying) !== normalizeAddress(filter.underlyingId)) {
    return false;
  }
  if (filter.quoteAssetId && normalizeAddress(cfg.quote) !== normalizeAddress(filter.quoteAssetId)) {
    return false;
  }
  if (filter.optionType) {
    const optionType = cfg.isCall ? "CALL" : "PUT";
    if (optionType !== filter.optionType) return false;
  }
  const expiry = cfg.expiry;
  const from = parseTimestampSeconds(filter.expiryFrom);
  if (from !== null && expiry < from) return false;
  const to = parseTimestampSeconds(filter.expiryTo);
  if (to !== null && expiry > to) return false;
  return true;
}

async function loadAsset(
  ctx: GraphQLContext,
  cache: Map<string, AssetRecord | null>,
  id: string
): Promise<AssetRecord | null> {
  const normalizedId = normalizeAddress(id);
  if (cache.has(normalizedId)) return cache.get(normalizedId) ?? null;
  if (!normalizedId || normalizedId === ZERO_ADDRESS) return null;
  const record = await ctx.prisma.asset.findUnique({
    where: { id: normalizedId },
    select: assetSelect
  });
  cache.set(normalizedId, record ?? null);
  return record ?? null;
}

function formatSeriesMetric(metric: SeriesWithRelations["metric"] | null | undefined): SeriesMetricsDTO | null {
  if (!metric) return null;
  return {
    markIv: decimalToString(metric.markIv),
    markDelta: decimalToString(metric.markDelta),
    markGamma: decimalToString(metric.markGamma),
    markVega: decimalToString(metric.markVega),
    markTheta: decimalToString(metric.markTheta),
    markRho: decimalToString(metric.markRho),
    lastQuoteAt: metric.lastQuoteAt ? metric.lastQuoteAt.toISOString() : null,
    lastTradeAt: metric.lastTradeAt ? metric.lastTradeAt.toISOString() : null,
    updatedAt: metric.updatedAt ? metric.updatedAt.toISOString() : null,
    oiLong: metric.oiLong !== null && metric.oiLong !== undefined ? metric.oiLong.toString() : null,
    oiShort: metric.oiShort !== null && metric.oiShort !== undefined ? metric.oiShort.toString() : null,
    openInterestUsd: decimalToString(metric.openInterestUsd),
    utilizationRatio: decimalToString(metric.utilizationRatio)
  };
}
