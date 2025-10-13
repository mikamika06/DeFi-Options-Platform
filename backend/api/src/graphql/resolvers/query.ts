import type { GraphQLContext } from "../../context";
import type {
  MarginEventFilterInput,
  PaginationInput,
  PositionFilterInput,
  RiskSnapshotFilterInput,
  SeriesFilterInput,
  TradeFilterInput
} from "../types";
import { listAssets, getAsset } from "../../services/assetService";
import { listSeries, getSeriesById } from "../../services/seriesService";
import { getQuote } from "../../services/quoteService";
import { listPools, getPool, listLpPositions } from "../../services/poolService";
import { listTrades } from "../../services/tradeService";
import { listPositions } from "../../services/positionService";
import { listRiskSnapshots } from "../../services/riskService";
import { listMarginEvents } from "../../services/marginEventService";

type AssetsArgs = Record<string, never>;
type AssetArgs = { id: string };
type SeriesArgs = { filter?: SeriesFilterInput | null };
type SeriesByIdArgs = { id: string };
type QuoteArgs = { seriesId: string; size: string };
type PoolArgs = { id: string };
type LpPositionsArgs = { userAddress: string };
type TradesArgs = { filter?: TradeFilterInput | null; pagination?: PaginationInput | null };
type PositionsArgs = { filter: PositionFilterInput };
type RiskSnapshotsArgs = { filter: RiskSnapshotFilterInput };
type MarginEventsArgs = { filter: MarginEventFilterInput; pagination?: PaginationInput | null };

export const Query = {
  assets: async (_: unknown, __: AssetsArgs, ctx: GraphQLContext) => listAssets(ctx),
  asset: async (_: unknown, args: AssetArgs, ctx: GraphQLContext) => getAsset(ctx, args.id),
  series: async (_: unknown, args: SeriesArgs, ctx: GraphQLContext) => listSeries(ctx, args.filter ?? null),
  seriesById: async (_: unknown, args: SeriesByIdArgs, ctx: GraphQLContext) => getSeriesById(ctx, args.id),
  pools: async (_: unknown, __: AssetsArgs, ctx: GraphQLContext) => listPools(ctx),
  pool: async (_: unknown, args: PoolArgs, ctx: GraphQLContext) => getPool(ctx, args.id),
  lpPositions: async (_: unknown, args: LpPositionsArgs, ctx: GraphQLContext) => listLpPositions(ctx, args.userAddress),
  trades: async (_: unknown, args: TradesArgs, ctx: GraphQLContext) =>
    listTrades(ctx, args.filter ?? null, args.pagination ?? null),
  positions: async (_: unknown, args: PositionsArgs, ctx: GraphQLContext) => listPositions(ctx, args.filter),
  riskSnapshots: async (_: unknown, args: RiskSnapshotsArgs, ctx: GraphQLContext) => listRiskSnapshots(ctx, args.filter),
  marginEvents: async (_: unknown, args: MarginEventsArgs, ctx: GraphQLContext) =>
    listMarginEvents(ctx, args.filter, args.pagination ?? null),
  quote: async (_: unknown, args: QuoteArgs, ctx: GraphQLContext) => getQuote(ctx, args.seriesId, args.size)
};
