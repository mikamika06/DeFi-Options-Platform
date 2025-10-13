import { Prisma, RiskAlertLevel } from "@prisma/client";

import type { GraphQLContext } from "../context";
import type { RiskSnapshotDTO, RiskSnapshotFilterInput } from "../graphql/types";
import { getSeriesMap, buildFallbackSeries } from "./seriesService";
import { normalizeAddress } from "../utils/address";
import { decimalToString, toStringSafe } from "../utils/number";
import { parseDateBound } from "../utils/time";

type RiskSnapshotRecord = Prisma.RiskSnapshotGetPayload<{}>;

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function listRiskSnapshots(
  ctx: GraphQLContext,
  filter: RiskSnapshotFilterInput
): Promise<RiskSnapshotDTO[]> {
  const where = buildRiskSnapshotWhere(filter);
  const take = clampLimit(filter.limit);

  const records = await ctx.prisma.riskSnapshot.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take
  });

  const seriesIds = records
    .map((record) => record.seriesId)
    .filter((value): value is string => Boolean(value));
  const seriesMap = await getSeriesMap(ctx, seriesIds);

  return records.map((record) =>
    formatRiskSnapshot(record, record.seriesId ? seriesMap.get(record.seriesId) ?? buildFallbackSeries(record.seriesId) : null)
  );
}

function buildRiskSnapshotWhere(filter: RiskSnapshotFilterInput): Prisma.RiskSnapshotWhereInput {
  const where: Prisma.RiskSnapshotWhereInput = {
    userAddress: normalizeAddress(filter.userAddress)
  };

  if (filter.seriesId) {
    where.seriesId = filter.seriesId;
  }

  if (filter.alertLevels?.length) {
    const levels = filter.alertLevels
      .map((level) => level.trim().toUpperCase())
      .filter((level) => level in RiskAlertLevel) as RiskAlertLevel[];
    if (levels.length) {
      where.alertLevel = { in: levels };
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

function formatRiskSnapshot(record: RiskSnapshotRecord, series: RiskSnapshotDTO["series"]): RiskSnapshotDTO {
  return {
    id: record.id,
    seriesId: record.seriesId ?? null,
    series,
    userAddress: normalizeAddress(record.userAddress),
    netDelta: decimalToString(record.netDelta),
    netGamma: decimalToString(record.netGamma),
    netVega: decimalToString(record.netVega),
    marginRequiredWad: record.marginRequiredWad ? toStringSafe(record.marginRequiredWad) : null,
    marginAvailableWad: record.marginAvailableWad ? toStringSafe(record.marginAvailableWad) : null,
    liquidationPrice: decimalToString(record.liquidationPrice),
    alertLevel: record.alertLevel,
    timestamp: record.timestamp.toISOString()
  };
}

function clampLimit(limit: number | null | undefined) {
  if (limit === null || limit === undefined) return DEFAULT_LIMIT;
  if (Number.isNaN(limit) || limit <= 0) return DEFAULT_LIMIT;
  return Math.min(limit, MAX_LIMIT);
}
