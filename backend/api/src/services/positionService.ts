import { Prisma, PositionType } from "@prisma/client";

import type { GraphQLContext } from "../context";
import type { PositionDTO, PositionFilterInput } from "../graphql/types";
import { getSeriesMap, buildFallbackSeries } from "./seriesService";
import { normalizeAddress } from "../utils/address";
import { toStringSafe } from "../utils/number";

type PositionRecord = Prisma.PositionGetPayload<{}>;

export async function listPositions(ctx: GraphQLContext, filter: PositionFilterInput): Promise<PositionDTO[]> {
  const where = buildPositionWhere(filter);
  const positions = await ctx.prisma.position.findMany({
    where,
    orderBy: { lastUpdated: "desc" }
  });

  const seriesMap = await getSeriesMap(
    ctx,
    positions.map((p) => p.seriesId)
  );

  return positions.map((position) =>
    formatPosition(position, seriesMap.get(position.seriesId) ?? buildFallbackSeries(position.seriesId))
  );
}

function buildPositionWhere(filter: PositionFilterInput): Prisma.PositionWhereInput {
  const where: Prisma.PositionWhereInput = {
    userAddress: normalizeAddress(filter.userAddress)
  };

  if (filter.seriesId) {
    where.seriesId = filter.seriesId;
  }
  if (filter.positionType) {
    const type = filter.positionType.toUpperCase();
    if (type === "LONG") where.positionType = PositionType.LONG;
    if (type === "SHORT") where.positionType = PositionType.SHORT;
  }

  return where;
}

function formatPosition(position: PositionRecord, series: PositionDTO["series"]): PositionDTO {
  return {
    id: position.id,
    seriesId: position.seriesId,
    series,
    userAddress: normalizeAddress(position.userAddress),
    positionType: position.positionType,
    sizeWad: toStringSafe(position.sizeWad ?? 0n),
    avgPriceWad: toStringSafe(position.avgPriceWad ?? 0n),
    pnlUnrealizedWad: toStringSafe(position.pnlUnrealizedWad ?? 0n),
    pnlRealizedWad: toStringSafe(position.pnlRealizedWad ?? 0n),
    lastUpdated: position.lastUpdated ? position.lastUpdated.toISOString() : new Date(0).toISOString()
  };
}
