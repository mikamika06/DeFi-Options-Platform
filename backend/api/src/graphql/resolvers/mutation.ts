import type { GraphQLContext } from "../../context";
import {
  buildCloseShortCalldata,
  buildCreateSeriesCalldata,
  buildExerciseCalldata,
  buildLpDepositCalldata,
  buildLpWithdrawCalldata,
  buildOpenShortCalldata,
  buildSettleSeriesCalldata,
  buildTradeCalldata,
  type CreateSeriesCalldataInput
} from "../../services/transactionService";
import { enqueueRiskSnapshot } from "../../services/riskQueueService";

type TradeArgs = { seriesId: string; size: string; maxPremium: string };
type ExerciseArgs = { seriesId: string; size: string; minPayout: string };
type LpDepositArgs = { input: { assets: string; receiver: string } };
type LpWithdrawArgs = { input: { assets: string; receiver: string; owner: string } };
type OpenShortArgs = { input: { seriesId: string; size: string; recipient: string } };
type CloseShortArgs = { input: { seriesId: string; size: string } };
type CreateSeriesArgs = { input: CreateSeriesCalldataInput };
type SettleSeriesArgs = { input: { seriesId: string; residualRecipient?: string | null } };
type EnqueueRiskArgs = { userAddress: string };

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
  createSeriesCalldata: async (_: unknown, args: CreateSeriesArgs, ctx: GraphQLContext) =>
    buildCreateSeriesCalldata(ctx, args.input),
  settleSeriesCalldata: async (_: unknown, args: SettleSeriesArgs, ctx: GraphQLContext) =>
    buildSettleSeriesCalldata(ctx, args.input.seriesId, args.input.residualRecipient ?? null),
  enqueueRiskSnapshot: async (_: unknown, args: EnqueueRiskArgs, ctx: GraphQLContext) =>
    enqueueRiskSnapshot(ctx, args.userAddress)
};
