import { Prisma } from "@prisma/client";

import type { GraphQLContext } from "../context";
import type { MarginEventConnectionDTO, MarginEventDTO, MarginEventFilterInput, PaginationInput } from "../graphql/types";
import { getSeriesMap, buildFallbackSeries } from "./seriesService";
import { normalizeAddress } from "../utils/address";
import { toStringSafe } from "../utils/number";
import { parseDateBound } from "../utils/time";

type MarginEventRecord = Prisma.MarginEventGetPayload<{}>;

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function listMarginEvents(
  ctx: GraphQLContext,
  filter: MarginEventFilterInput,
  pagination: PaginationInput | null
): Promise<MarginEventConnectionDTO> {
  const where = buildMarginEventWhere(filter);
  const take = clampLimit(pagination?.limit);

  const events = await ctx.prisma.marginEvent.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: take + 1,
    ...(pagination?.cursor ? { skip: 1, cursor: { id: pagination.cursor } } : {})
  });

  const sliced = events.slice(0, take);
  const nextCursor = events.length > take ? events[take].id : null;

  const seriesIds = sliced
    .map((event) => event.seriesId)
    .filter((value): value is string => Boolean(value));
  const seriesMap = await getSeriesMap(ctx, seriesIds);

  const items: MarginEventDTO[] = sliced.map((event) =>
    formatMarginEvent(event, event.seriesId ? seriesMap.get(event.seriesId) ?? buildFallbackSeries(event.seriesId) : null)
  );

  return { items, nextCursor };
}

function buildMarginEventWhere(filter: MarginEventFilterInput): Prisma.MarginEventWhereInput {
  const where: Prisma.MarginEventWhereInput = {
    userAddress: normalizeAddress(filter.userAddress)
  };

  if (filter.seriesId) {
    where.seriesId = filter.seriesId;
  }

  if (filter.eventTypes?.length) {
    const normalized = filter.eventTypes.map((type) => type.trim().toUpperCase()).filter(Boolean);
    if (normalized.length) {
      where.eventType = { in: normalized };
    }
  }

  const from = parseDateBound(filter.timestampFrom);
  const to = parseDateBound(filter.timestampTo);
  if (from || to) {
    where.timestamp = {};
    if (from) where.timestamp.gte = from;
    if (to) where.timestamp.lte = to;
  }

  return where;
}

function formatMarginEvent(event: MarginEventRecord, series: MarginEventDTO["series"]): MarginEventDTO {
  return {
    id: event.id,
    seriesId: event.seriesId ?? null,
    series,
    userAddress: normalizeAddress(event.userAddress),
    eventType: event.eventType,
    deltaWad: toStringSafe(event.deltaWad ?? 0n),
    resultingMarginWad: toStringSafe(event.resultingMarginWad ?? 0n),
    metadata: event.metadata ? JSON.stringify(event.metadata) : null,
    timestamp: event.timestamp.toISOString()
  };
}

function clampLimit(limit: number | null | undefined) {
  if (limit === null || limit === undefined) return DEFAULT_LIMIT;
  if (Number.isNaN(limit) || limit <= 0) return DEFAULT_LIMIT;
  return Math.min(limit, MAX_LIMIT);
}
