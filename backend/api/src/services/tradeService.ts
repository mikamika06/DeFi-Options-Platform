import { Prisma, TradeSide } from "@prisma/client";

import type { GraphQLContext } from "../context";
import type { PaginationInput, TradeConnectionDTO, TradeDTO, TradeFilterInput, SeriesDTO } from "../graphql/types";
import { getSeriesMap, buildFallbackSeries } from "./seriesService";
import { normalizeAddress } from "../utils/address";
import { toStringSafe } from "../utils/number";

type TradeRecord = Prisma.TradeGetPayload<{}>;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function listTrades(
  ctx: GraphQLContext,
  filter: TradeFilterInput | null,
  pagination: PaginationInput | null
): Promise<TradeConnectionDTO> {
  const take = clampLimit(pagination?.limit);
  const where = buildTradeWhere(filter);

  const trades = await ctx.prisma.trade.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: take + 1,
    ...(pagination?.cursor ? { skip: 1, cursor: { id: pagination.cursor } } : {})
  });

  const sliced = trades.slice(0, take);
  const nextCursor = trades.length > take ? trades[take].id : null;

  const seriesIds = sliced.map((trade) => trade.seriesId);
  const seriesMap = await getSeriesMap(ctx, seriesIds);

  const missing = seriesIds.filter((id) => id && !seriesMap.has(id));
  if (missing.length) {
    const missingMap = await getSeriesMap(ctx, missing);
    missingMap.forEach((value, key) => seriesMap.set(key, value));
  }

  const items: TradeDTO[] = sliced.map((trade) =>
    formatTrade(trade, seriesMap.get(trade.seriesId) ?? buildFallbackSeries(trade.seriesId))
  );

  return { items, nextCursor };
}

function buildTradeWhere(filter: TradeFilterInput | null | undefined): Prisma.TradeWhereInput {
  if (!filter) return {};
  const where: Prisma.TradeWhereInput = {};

  if (filter.seriesId) {
    where.seriesId = filter.seriesId;
  }
  if (filter.userAddress) {
    where.userAddress = normalizeAddress(filter.userAddress);
  }
  if (filter.side) {
    const side = filter.side.toUpperCase();
    if (side === "BUY") where.side = TradeSide.BUY;
    if (side === "SELL") where.side = TradeSide.SELL;
  }

  return where;
}

function formatTrade(record: TradeRecord, series: SeriesDTO): TradeDTO {
  return {
    id: record.id,
    seriesId: record.seriesId,
    series,
    userAddress: normalizeAddress(record.userAddress),
    side: record.side,
    sizeWad: toStringSafe(record.sizeWad ?? 0n),
    premiumWad: toStringSafe(record.premiumWad ?? 0n),
    feeWad: toStringSafe(record.feeWad ?? 0n),
    txHash: record.txHash,
    blockNumber: toStringSafe(record.blockNumber ?? 0n),
    timestamp: record.timestamp ? record.timestamp.toISOString() : new Date(0).toISOString()
  };
}

function clampLimit(limit: number | null | undefined) {
  if (limit === null || limit === undefined) return DEFAULT_LIMIT;
  if (Number.isNaN(limit) || limit <= 0) return DEFAULT_LIMIT;
  return Math.min(limit, MAX_LIMIT);
}
