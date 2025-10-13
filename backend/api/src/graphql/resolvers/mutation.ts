import type { GraphQLContext } from "../../context";
import {
  buildCloseShortCalldata,
  buildCreateSeriesCalldata,
  buildExerciseCalldata,
  buildLpDepositCalldata,
  buildLpWithdrawCalldata,
  buildOpenShortCalldata,
  buildSettleSeriesCalldata,
  buildIvUpdateCalldata,
  buildTradeCalldata,
  type CreateSeriesCalldataInput
} from "../../services/transactionService";
import { enqueueRiskSnapshot } from "../../services/riskQueueService";
import { executeSettleSeries } from "../../services/settlementService";
import { enqueueSettlement } from "../../services/settlementQueueService";
import { executeLiquidation } from "../../services/liquidationService";
import { enqueueLiquidation } from "../../services/liquidationQueueService";
import { enqueueMarginCheck } from "../../services/marginQueueService";
import { executeIvUpdate } from "../../services/ivService";
import { enqueueIvUpdate } from "../../services/ivQueueService";
import { enqueueGreeks } from "../../services/greeksQueueService";
import { requireRole, requireAnyRole } from "../../services/authService";

type TradeArgs = { seriesId: string; size: string; maxPremium: string };
type ExerciseArgs = { seriesId: string; size: string; minPayout: string };
type LpDepositArgs = { input: { assets: string; receiver: string } };
type LpWithdrawArgs = { input: { assets: string; receiver: string; owner: string } };
type OpenShortArgs = { input: { seriesId: string; size: string; recipient: string } };
type CloseShortArgs = { input: { seriesId: string; size: string } };
type CreateSeriesArgs = { input: CreateSeriesCalldataInput };
type SettleSeriesArgs = { input: { seriesId: string; residualRecipient?: string | null } };
type EnqueueRiskArgs = { userAddress: string };
type SettleExecuteArgs = { seriesId: string; residualRecipient?: string | null };
type EnqueueSettlementArgs = { seriesId: string; residualRecipient?: string | null };
type LiquidationArgs = { input: { seriesId: string; account: string; size: string; receiver?: string | null } };
type MarginCheckArgs = { input: { account: string; seriesId?: string | null; size?: string | null; receiver?: string | null } };
type IvUpdateArgs = { input: { seriesId: string; ivWad: string } };
type EnqueueGreeksArgs = { seriesId: string };

export const Mutation = {
  tradeCalldata: async (_: unknown, args: TradeArgs, ctx: GraphQLContext) =>
    buildTradeCalldata(ctx, args.seriesId, args.size, args.maxPremium),
  exerciseCalldata: async (_: unknown, args: ExerciseArgs, ctx: GraphQLContext) =>
    buildExerciseCalldata(ctx, args.seriesId, args.size, args.minPayout),
  lpDepositCalldata: async (_: unknown, args: LpDepositArgs, ctx: GraphQLContext) =>
    buildLpDepositCalldata(ctx, args.input.assets, args.input.receiver),
  lpWithdrawCalldata: async (_: unknown, args: LpWithdrawArgs, ctx: GraphQLContext) =>
    buildLpWithdrawCalldata(ctx, args.input.assets, args.input.receiver, args.input.owner),
  openShortCalldata: async (_: unknown, args: OpenShortArgs, ctx: GraphQLContext) =>
    buildOpenShortCalldata(ctx, args.input.seriesId, args.input.size, args.input.recipient),
  closeShortCalldata: async (_: unknown, args: CloseShortArgs, ctx: GraphQLContext) =>
    buildCloseShortCalldata(ctx, args.input.seriesId, args.input.size),
  createSeriesCalldata: async (_: unknown, args: CreateSeriesArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildCreateSeriesCalldata(ctx, args.input);
  },
  settleSeriesCalldata: async (_: unknown, args: SettleSeriesArgs, ctx: GraphQLContext) =>
    buildSettleSeriesCalldata(ctx, args.input.seriesId, args.input.residualRecipient ?? null),
  enqueueRiskSnapshot: async (_: unknown, args: EnqueueRiskArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "keeper");
    return enqueueRiskSnapshot(ctx, args.userAddress);
  },
  settleSeriesExecute: async (_: unknown, args: SettleExecuteArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "keeper");
    return executeSettleSeries(args.seriesId, args.residualRecipient ?? null);
  },
  enqueueSettlement: async (_: unknown, args: EnqueueSettlementArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "keeper");
    return enqueueSettlement(args.seriesId, args.residualRecipient ?? null);
  },
  liquidatePositionExecute: async (_: unknown, args: LiquidationArgs, ctx: GraphQLContext) => {
    requireAnyRole(ctx, ["keeper", "liquidator"]);
    return executeLiquidation(args.input.seriesId, args.input.account, args.input.size, args.input.receiver ?? null);
  },
  enqueueLiquidation: async (_: unknown, args: LiquidationArgs, ctx: GraphQLContext) => {
    requireAnyRole(ctx, ["keeper", "liquidator"]);
    return enqueueLiquidation(args.input.seriesId, args.input.account, args.input.size, args.input.receiver ?? null);
  },
  enqueueMarginCheck: async (_: unknown, args: MarginCheckArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "keeper");
    return enqueueMarginCheck({
      account: args.input.account,
      seriesId: args.input.seriesId ?? null,
      size: args.input.size ?? null,
      receiver: args.input.receiver ?? null
    });
  },
  ivUpdateCalldata: async (_: unknown, args: IvUpdateArgs, ctx: GraphQLContext) =>
    buildIvUpdateCalldata(ctx, args.input.seriesId, args.input.ivWad),
  ivUpdateExecute: async (_: unknown, args: IvUpdateArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "keeper");
    return executeIvUpdate(args.input.seriesId, args.input.ivWad);
  },
  enqueueIvUpdate: async (_: unknown, args: IvUpdateArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "keeper");
    return enqueueIvUpdate(args.input.seriesId, args.input.ivWad);
  },
  enqueueGreeks: async (_: unknown, args: EnqueueGreeksArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "keeper");
    return enqueueGreeks(args.seriesId);
  }
};
