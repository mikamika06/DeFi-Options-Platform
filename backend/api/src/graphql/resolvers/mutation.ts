import type { GraphQLContext } from "../../context";
import {
  buildCloseShortCalldata,
  buildCreateSeriesCalldata,
  buildExerciseCalldata,
  buildLpDepositCalldata,
  buildLpWithdrawCalldata,
  buildOpenShortCalldata,
  buildCollateralDepositCalldata,
  buildCollateralWithdrawCalldata,
  buildCollateralSetPriceCalldata,
  buildCollateralSetConfigCalldata,
  buildGrantRoleCalldata,
  buildOracleSetPriceCalldata,
  buildSettleSeriesCalldata,
  buildIvUpdateCalldata,
  buildTradeCalldata,
  buildOptionsMarketSetFeeRecipient,
  buildOptionsMarketSetOracleRouter,
  buildOptionsMarketSetIvOracle,
  buildOptionsMarketSetCollateralManager,
  buildOptionsMarketSetLiquidityVault,
  buildOptionsMarketSetInsuranceFund,
  buildOptionsMarketSetInsuranceFeeBps,
  buildOptionsMarketSetSettlementShares,
  buildCollateralSetMarginParameters,
  buildCollateralSetLiquidatableMarket,
  buildCollateralSetMaintenanceMargin,
  buildCollateralPause,
  buildCollateralUnpause,
  buildCollateralForceLiquidation,
  buildCollateralLockMargin,
  buildCollateralReleaseMargin,
  buildCollateralEvaluateAccount,
  buildCollateralResolveLiquidation,
  buildCollateralExecuteLiquidation,
  buildVaultPause,
  buildVaultUnpause,
  buildVaultSetHedgeReserveBps,
  buildVaultSetHedgeOperator,
  buildVaultSetTrancheConfig,
  buildVaultDefineTranche,
  buildVaultSetPremiumHandler,
  buildVaultRecordPremium,
  buildVaultRecordLoss,
  buildVaultHandleSettlement,
  buildVaultClaimTranche,
  buildVaultClaimProtocolReserve,
  buildVaultAccruePerformanceFee,
  buildVaultAccrueManagementFee,
  buildVaultRequestHedgeFunds,
  buildVaultReturnHedgeProfit,
  buildInsuranceSetAssetApproval,
  buildInsuranceSetMarket,
  buildInsuranceDeposit,
  buildInsuranceNotifyPremium,
  buildInsuranceRequestCoverage,
  buildInsuranceWithdraw,
  buildInsuranceRescue,
  buildOptionTokenSetBaseUri,
  buildOptionTokenGrantRoles,
  buildOptionTokenRevokeRoles,
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
type CollateralMoveArgs = { input: { account: string; asset: string; amount: string } };
type CollateralPriceArgs = { input: { asset: string; priceWad: string } };
type CollateralConfigArgs = {
  input: {
    asset: string;
    isEnabled: boolean;
    collateralFactorBps: number;
    liquidationThresholdBps: number;
    decimals: number;
  };
};
type GrantRoleArgs = { input: { contract: string; role: string; account: string } };
type OraclePriceArgs = { input: { asset: string; price: string; decimals: number } };
type OptionsMarketAddressArgs = { address: string };
type OptionsMarketSettlementArgs = { input: { vaultShareBps: number; insuranceShareBps: number } };
type CollateralMarginParamsArgs = { input: { initialBps: number; maintenanceBps: number; gracePeriod: number } };
type CollateralLiquidatableMarketArgs = { input: { market: string; approved: boolean } };
type CollateralMaintenanceArgs = { input: { account: string; requirement: string } };
type CollateralMarginMovementArgs = { input: { account: string; amountWad: string; maintenanceDeltaWad: string } };
type CollateralLiquidationArgs = { input: { account: string; asset: string; amount: string } };
type CollateralExecuteLiquidationArgs = {
  input: { market: string; seriesId: string; account: string; size: string; payoutRecipient?: string | null };
};
type AccountArgs = { account: string };
type VaultBpsArgs = { newBps: number };
type VaultOperatorArgs = { operator: string };
type VaultTrancheConfigArgs = {
  input: { performanceFeeBps: number; managementFeeBps: number; withdrawalCooldown: number };
};
type VaultDefineTrancheArgs = { input: { trancheId: string; weightBps: number } };
type VaultPremiumHandlerArgs = { input: { handler: string; enabled: boolean } };
type VaultAssetAmountArgs = { input: { asset: string; amount: string } };
type VaultClaimTrancheArgs = { input: { trancheId: string; recipient: string } };
type VaultRecipientArgs = { recipient: string };
type VaultAmountArgs = { amount: string };
type VaultHedgeRequestArgs = { input: { amount: string; recipient: string } };
type InsuranceApprovalArgs = { input: { asset: string; approved: boolean } };
type InsuranceMarketArgs = { input: { market: string; enabled: boolean } };
type InsuranceAmountArgs = { input: { asset: string; amount: string } };
type InsuranceTransferArgs = { input: { asset: string; amount: string; recipient: string } };
type OptionTokenUriArgs = { uri: string };
type OptionTokenAccountArgs = { account: string };

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
  collateralDepositCalldata: async (_: unknown, args: CollateralMoveArgs, ctx: GraphQLContext) =>
    buildCollateralDepositCalldata(ctx, args.input),
  collateralWithdrawCalldata: async (_: unknown, args: CollateralMoveArgs, ctx: GraphQLContext) =>
    buildCollateralWithdrawCalldata(ctx, args.input),
  collateralSetPriceCalldata: async (_: unknown, args: CollateralPriceArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildCollateralSetPriceCalldata(ctx, args.input.asset, args.input.priceWad);
  },
  collateralSetConfigCalldata: async (_: unknown, args: CollateralConfigArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildCollateralSetConfigCalldata(ctx, args.input);
  },
  grantRoleCalldata: async (_: unknown, args: GrantRoleArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildGrantRoleCalldata(ctx, args.input);
  },
  oracleSetPriceCalldata: async (_: unknown, args: OraclePriceArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildOracleSetPriceCalldata(ctx, args.input);
  },
  createSeriesCalldata: async (_: unknown, args: CreateSeriesArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildCreateSeriesCalldata(ctx, args.input);
  },
  optionsMarketSetFeeRecipient: async (_: unknown, args: OptionsMarketAddressArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildOptionsMarketSetFeeRecipient(ctx, args.address);
  },
  optionsMarketSetOracleRouter: async (_: unknown, args: OptionsMarketAddressArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildOptionsMarketSetOracleRouter(ctx, args.address);
  },
  optionsMarketSetIvOracle: async (_: unknown, args: OptionsMarketAddressArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildOptionsMarketSetIvOracle(ctx, args.address);
  },
  optionsMarketSetCollateralManager: async (_: unknown, args: OptionsMarketAddressArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildOptionsMarketSetCollateralManager(ctx, args.address);
  },
  optionsMarketSetLiquidityVault: async (_: unknown, args: OptionsMarketAddressArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildOptionsMarketSetLiquidityVault(ctx, args.address);
  },
  optionsMarketSetInsuranceFund: async (_: unknown, args: OptionsMarketAddressArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildOptionsMarketSetInsuranceFund(ctx, args.address);
  },
  optionsMarketSetInsuranceFeeBps: async (_: unknown, args: { feeBps: number }, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildOptionsMarketSetInsuranceFeeBps(ctx, args.feeBps);
  },
  optionsMarketSetSettlementShares: async (_: unknown, args: OptionsMarketSettlementArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildOptionsMarketSetSettlementShares(ctx, args.input);
  },
  collateralSetMarginParameters: async (_: unknown, args: CollateralMarginParamsArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildCollateralSetMarginParameters(ctx, args.input);
  },
  collateralSetLiquidatableMarket: async (
    _: unknown,
    args: CollateralLiquidatableMarketArgs,
    ctx: GraphQLContext
  ) => {
    requireRole(ctx, "admin");
    return buildCollateralSetLiquidatableMarket(ctx, args.input.market, args.input.approved);
  },
  collateralSetMaintenanceMargin: async (_: unknown, args: CollateralMaintenanceArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildCollateralSetMaintenanceMargin(ctx, args.input.account, args.input.requirement);
  },
  collateralPause: async (_: unknown, __: Record<string, never>, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildCollateralPause(ctx);
  },
  collateralUnpause: async (_: unknown, __: Record<string, never>, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildCollateralUnpause(ctx);
  },
  collateralForceLiquidation: async (_: unknown, args: CollateralLiquidationArgs, ctx: GraphQLContext) => {
    requireAnyRole(ctx, ["liquidator", "admin"]);
    return buildCollateralForceLiquidation(ctx, args.input);
  },
  collateralLockMargin: async (_: unknown, args: CollateralMarginMovementArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildCollateralLockMargin(ctx, args.input);
  },
  collateralReleaseMargin: async (_: unknown, args: CollateralMarginMovementArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildCollateralReleaseMargin(ctx, args.input);
  },
  collateralEvaluateAccount: async (_: unknown, args: AccountArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildCollateralEvaluateAccount(ctx, args.account);
  },
  collateralResolveLiquidation: async (_: unknown, args: AccountArgs, ctx: GraphQLContext) => {
    requireAnyRole(ctx, ["liquidator", "admin"]);
    return buildCollateralResolveLiquidation(ctx, args.account);
  },
  collateralExecuteLiquidation: async (_: unknown, args: CollateralExecuteLiquidationArgs, ctx: GraphQLContext) => {
    requireAnyRole(ctx, ["liquidator", "admin"]);
    return buildCollateralExecuteLiquidation(ctx, args.input);
  },
  vaultPause: async (_: unknown, __: Record<string, never>, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildVaultPause(ctx);
  },
  vaultUnpause: async (_: unknown, __: Record<string, never>, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildVaultUnpause(ctx);
  },
  vaultSetHedgeReserveBps: async (_: unknown, args: VaultBpsArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildVaultSetHedgeReserveBps(ctx, args.newBps);
  },
  vaultSetHedgeOperator: async (_: unknown, args: VaultOperatorArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildVaultSetHedgeOperator(ctx, args.operator);
  },
  vaultSetTrancheConfig: async (_: unknown, args: VaultTrancheConfigArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildVaultSetTrancheConfig(ctx, args.input);
  },
  vaultDefineTranche: async (_: unknown, args: VaultDefineTrancheArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildVaultDefineTranche(ctx, args.input);
  },
  vaultSetPremiumHandler: async (_: unknown, args: VaultPremiumHandlerArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildVaultSetPremiumHandler(ctx, args.input);
  },
  vaultRecordPremium: async (_: unknown, args: VaultAssetAmountArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildVaultRecordPremium(ctx, args.input);
  },
  vaultRecordLoss: async (_: unknown, args: VaultAssetAmountArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildVaultRecordLoss(ctx, args.input);
  },
  vaultHandleSettlement: async (_: unknown, args: VaultAssetAmountArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildVaultHandleSettlement(ctx, args.input);
  },
  vaultClaimTranche: async (_: unknown, args: VaultClaimTrancheArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildVaultClaimTranche(ctx, args.input);
  },
  vaultClaimProtocolReserve: async (_: unknown, args: VaultRecipientArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildVaultClaimProtocolReserve(ctx, args.recipient);
  },
  vaultAccruePerformanceFee: async (_: unknown, args: VaultAmountArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildVaultAccruePerformanceFee(ctx, args.amount);
  },
  vaultAccrueManagementFee: async (_: unknown, args: VaultAmountArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildVaultAccrueManagementFee(ctx, args.amount);
  },
  vaultRequestHedgeFunds: async (_: unknown, args: VaultHedgeRequestArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildVaultRequestHedgeFunds(ctx, args.input);
  },
  vaultReturnHedgeProfit: async (_: unknown, args: VaultAmountArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildVaultReturnHedgeProfit(ctx, args.amount);
  },
  insuranceSetAssetApproval: async (_: unknown, args: InsuranceApprovalArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildInsuranceSetAssetApproval(ctx, args.input.asset, args.input.approved);
  },
  insuranceSetMarket: async (_: unknown, args: InsuranceMarketArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildInsuranceSetMarket(ctx, args.input.market, args.input.enabled);
  },
  insuranceDeposit: async (_: unknown, args: InsuranceAmountArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildInsuranceDeposit(ctx, args.input.asset, args.input.amount);
  },
  insuranceNotifyPremium: async (_: unknown, args: InsuranceAmountArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildInsuranceNotifyPremium(ctx, args.input.asset, args.input.amount);
  },
  insuranceRequestCoverage: async (_: unknown, args: InsuranceTransferArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildInsuranceRequestCoverage(ctx, args.input);
  },
  insuranceWithdraw: async (_: unknown, args: InsuranceTransferArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildInsuranceWithdraw(ctx, args.input);
  },
  insuranceRescue: async (_: unknown, args: InsuranceTransferArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildInsuranceRescue(ctx, args.input);
  },
  optionTokenSetBaseUri: async (_: unknown, args: OptionTokenUriArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildOptionTokenSetBaseUri(ctx, args.uri);
  },
  optionTokenGrantRoles: async (_: unknown, args: OptionTokenAccountArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildOptionTokenGrantRoles(ctx, args.account);
  },
  optionTokenRevokeRoles: async (_: unknown, args: OptionTokenAccountArgs, ctx: GraphQLContext) => {
    requireRole(ctx, "admin");
    return buildOptionTokenRevokeRoles(ctx, args.account);
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
