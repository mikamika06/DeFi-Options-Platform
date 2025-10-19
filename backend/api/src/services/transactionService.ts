import type { GraphQLContext } from "../context";
import { normalizeAddress } from "../utils/address";
import { ZERO_ADDRESS } from "../utils/constants";

function normalizeSeriesId(id: string): string {
  if (!id) throw new Error("seriesId is required");
  const value = id.toLowerCase();
  if (!value.startsWith("0x") || value.length !== 66) {
    throw new Error("seriesId must be 32-byte hex string");
  }
  return value;
}

function parseBigInt(value: string, field: string): bigint {
  try {
    return BigInt(value);
  } catch {
    throw new Error(`${field} must be bigint-compatible string`);
  }
}

function normalizeBytes32(value: string, field: string): string {
  if (!value) throw new Error(`${field} is required`);
  const normalized = value.toLowerCase();
  if (!normalized.startsWith("0x") || normalized.length !== 66) {
    throw new Error(`${field} must be 32-byte hex string`);
  }
  return normalized;
}

function parseUint(value: number | string, field: string, opts?: { max?: number }): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
  if (opts?.max !== undefined && parsed > opts.max) {
    throw new Error(`${field} must be <= ${opts.max}`);
  }
  return parsed;
}

export function buildTradeCalldata(
  ctx: GraphQLContext,
  seriesId: string,
  size: string,
  maxPremium: string
): string {
  const normalizedId = normalizeSeriesId(seriesId);
  const sizeBigInt = parseBigInt(size, "size");
  const maxPremiumBigInt = parseBigInt(maxPremium, "maxPremium");
  return ctx.sdk.optionsMarket.interface.encodeFunctionData("trade", [normalizedId, sizeBigInt, maxPremiumBigInt]);
}

export function buildExerciseCalldata(
  ctx: GraphQLContext,
  seriesId: string,
  size: string,
  minPayout: string
): string {
  const normalizedId = normalizeSeriesId(seriesId);
  const sizeBigInt = parseBigInt(size, "size");
  const minPayoutBigInt = parseBigInt(minPayout, "minPayout");
  return ctx.sdk.optionsMarket.interface.encodeFunctionData("exercise", [normalizedId, sizeBigInt, minPayoutBigInt]);
}

export function buildLpDepositCalldata(
  ctx: GraphQLContext,
  assets: string,
  receiver: string
): string {
  const assetAmount = parseBigInt(assets, "assets");
  const normalizedReceiver = normalizeAddress(receiver);
  return ctx.sdk.liquidityVault.interface.encodeFunctionData("deposit", [assetAmount, normalizedReceiver]);
}

export function buildLpWithdrawCalldata(
  ctx: GraphQLContext,
  assets: string,
  receiver: string,
  owner: string
): string {
  const assetAmount = parseBigInt(assets, "assets");
  const normalizedReceiver = normalizeAddress(receiver);
  const normalizedOwner = normalizeAddress(owner);
  return ctx.sdk.liquidityVault.interface.encodeFunctionData("withdraw", [
    assetAmount,
    normalizedReceiver,
    normalizedOwner
  ]);
}

export function buildOpenShortCalldata(
  ctx: GraphQLContext,
  seriesId: string,
  size: string,
  recipient: string
): string {
  const normalizedId = normalizeSeriesId(seriesId);
  const sizeBigInt = parseBigInt(size, "size");
  const normalizedRecipient = normalizeAddress(recipient);
  return ctx.sdk.optionsMarket.interface.encodeFunctionData("openShort", [
    normalizedId,
    sizeBigInt,
    normalizedRecipient
  ]);
}

export function buildCloseShortCalldata(ctx: GraphQLContext, seriesId: string, size: string): string {
  const normalizedId = normalizeSeriesId(seriesId);
  const sizeBigInt = parseBigInt(size, "size");
  return ctx.sdk.optionsMarket.interface.encodeFunctionData("closeShort", [normalizedId, sizeBigInt]);
}

type CollateralIoInput = {
  account: string;
  asset: string;
  amount: string;
};

export function buildCollateralDepositCalldata(ctx: GraphQLContext, input: CollateralIoInput): string {
  const account = normalizeAddress(input.account);
  const asset = normalizeAddress(input.asset);
  const amount = parseBigInt(input.amount, "amount");
  if (!account || account === ZERO_ADDRESS) {
    throw new Error("account must be a valid address");
  }
  if (!asset || asset === ZERO_ADDRESS) {
    throw new Error("asset must be a valid address");
  }
  return ctx.sdk.collateralManager.interface.encodeFunctionData("deposit", [account, asset, amount]);
}

export function buildCollateralWithdrawCalldata(ctx: GraphQLContext, input: CollateralIoInput): string {
  const account = normalizeAddress(input.account);
  const asset = normalizeAddress(input.asset);
  const amount = parseBigInt(input.amount, "amount");
  if (!account || account === ZERO_ADDRESS) {
    throw new Error("account must be a valid address");
  }
  if (!asset || asset === ZERO_ADDRESS) {
    throw new Error("asset must be a valid address");
  }
  return ctx.sdk.collateralManager.interface.encodeFunctionData("withdraw", [account, asset, amount]);
}

export function buildCollateralSetPriceCalldata(ctx: GraphQLContext, asset: string, priceWad: string): string {
  const normalizedAsset = normalizeAddress(asset);
  if (!normalizedAsset || normalizedAsset === ZERO_ADDRESS) {
    throw new Error("asset must be a valid address");
  }
  const price = parseBigInt(priceWad, "priceWad");
  if (price <= 0n) {
    throw new Error("priceWad must be positive");
  }
  return ctx.sdk.collateralManager.interface.encodeFunctionData("setAssetPrice", [normalizedAsset, price]);
}

type CollateralAssetConfigInput = {
  asset: string;
  isEnabled: boolean;
  collateralFactorBps: number;
  liquidationThresholdBps: number;
  decimals: number;
};

export function buildCollateralSetConfigCalldata(ctx: GraphQLContext, input: CollateralAssetConfigInput): string {
  const asset = normalizeAddress(input.asset);
  if (!asset || asset === ZERO_ADDRESS) {
    throw new Error("asset must be a valid address");
  }

  const collateralFactor = Number(input.collateralFactorBps);
  const liquidationThreshold = Number(input.liquidationThresholdBps);
  const decimals = Number(input.decimals);

  if (!Number.isInteger(collateralFactor) || collateralFactor < 0 || collateralFactor > 10_000) {
    throw new Error("collateralFactorBps must be integer between 0 and 10000");
  }
  if (!Number.isInteger(liquidationThreshold) || liquidationThreshold < 0 || liquidationThreshold > 10_000) {
    throw new Error("liquidationThresholdBps must be integer between 0 and 10000");
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error("decimals must be integer between 0 and 36");
  }

  const config = {
    isEnabled: Boolean(input.isEnabled),
    collateralFactorBps: collateralFactor,
    liquidationThresholdBps: liquidationThreshold,
    decimals
  } as const;

  return ctx.sdk.collateralManager.interface.encodeFunctionData("setAssetConfig", [asset, config]);
}

type GrantRoleInput = {
  contract: string;
  role: string;
  account: string;
};

export function buildGrantRoleCalldata(ctx: GraphQLContext, input: GrantRoleInput): string {
  const contractAddress = normalizeAddress(input.contract);
  if (!contractAddress || contractAddress === ZERO_ADDRESS) {
    throw new Error("contract must be a valid address");
  }
  const account = normalizeAddress(input.account);
  if (!account || account === ZERO_ADDRESS) {
    throw new Error("account must be a valid address");
  }
  const roleHex = input.role.toLowerCase();
  if (!roleHex.startsWith("0x") || roleHex.length !== 66) {
    throw new Error("role must be 32-byte hex string");
  }

  const normalizedMap = new Map<string, any>([
    [normalizeAddress(ctx.sdk.optionsMarket.target as string), ctx.sdk.optionsMarket.interface],
    [normalizeAddress(ctx.sdk.collateralManager.target as string), ctx.sdk.collateralManager.interface],
    [normalizeAddress(ctx.sdk.liquidityVault.target as string), ctx.sdk.liquidityVault.interface],
    [normalizeAddress(ctx.sdk.insuranceFund.target as string), ctx.sdk.insuranceFund.interface],
    [normalizeAddress(ctx.sdk.optionToken.target as string), ctx.sdk.optionToken.interface]
  ]);

  const contractInterface = normalizedMap.get(contractAddress);
  if (!contractInterface) {
    throw new Error("grantRole not supported for the provided contract address");
  }

  return contractInterface.encodeFunctionData("grantRole", [roleHex, account]);
}

type OraclePriceInput = {
  asset: string;
  price: string;
  decimals: number;
};

export function buildOracleSetPriceCalldata(ctx: GraphQLContext, input: OraclePriceInput): string {
  const asset = normalizeAddress(input.asset);
  if (!asset || asset === ZERO_ADDRESS) {
    throw new Error("asset must be a valid address");
  }
  const price = parseBigInt(input.price, "price");
  const decimals = Number(input.decimals);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error("decimals must be integer between 0 and 36");
  }
  return ctx.sdk.oracleRouter.interface.encodeFunctionData("setAssetPrice", [asset, price, decimals]);
}

export type CreateSeriesCalldataInput = {
  underlying: string;
  quote: string;
  strikeWad: string;
  expiry: string;
  isCall: boolean;
  baseFeeBps: number;
};

export function buildCreateSeriesCalldata(ctx: GraphQLContext, input: CreateSeriesCalldataInput): string {
  const strike = parseBigInt(input.strikeWad, "strikeWad");
  const expiry = parseBigInt(input.expiry, "expiry");
  const config = {
    underlying: normalizeAddress(input.underlying),
    quote: normalizeAddress(input.quote),
    strike,
    expiry,
    isCall: Boolean(input.isCall),
    baseFeeBps: Number(input.baseFeeBps)
  };
  if (expiry <= 0n) {
    throw new Error("expiry must be positive integer timestamp");
  }
  if (!Number.isInteger(config.baseFeeBps) || config.baseFeeBps < 0 || config.baseFeeBps > 10_000) {
    throw new Error("baseFeeBps must be between 0 and 10000");
  }
  return ctx.sdk.optionsMarket.interface.encodeFunctionData("createSeries", [config]);
}

export function buildSettleSeriesCalldata(
  ctx: GraphQLContext,
  seriesId: string,
  residualRecipient?: string | null
): string {
  const normalizedId = normalizeSeriesId(seriesId);
  const recipient = residualRecipient ? normalizeAddress(residualRecipient) : ZERO_ADDRESS;
  return ctx.sdk.optionsMarket.interface.encodeFunctionData("settleSeries", [normalizedId, recipient]);
}

export function buildIvUpdateCalldata(ctx: GraphQLContext, seriesId: string, ivWad: string): string {
  const normalizedId = normalizeSeriesId(seriesId);
  const iv = parseBigInt(ivWad, "iv");
  return ctx.sdk.ivOracle.interface.encodeFunctionData("setIV", [normalizedId, iv]);
}

/* ----------------------- Options Market Admin ----------------------- */

export function buildOptionsMarketSetFeeRecipient(ctx: GraphQLContext, recipient: string): string {
  const address = normalizeAddress(recipient);
  if (!address || address === ZERO_ADDRESS) {
    throw new Error("recipient must be a valid address");
  }
  return ctx.sdk.optionsMarket.interface.encodeFunctionData("setFeeRecipient", [address]);
}

export function buildOptionsMarketSetOracleRouter(ctx: GraphQLContext, router: string): string {
  const address = normalizeAddress(router);
  if (!address || address === ZERO_ADDRESS) {
    throw new Error("oracle router must be a valid address");
  }
  return ctx.sdk.optionsMarket.interface.encodeFunctionData("setOracleRouter", [address]);
}

export function buildOptionsMarketSetIvOracle(ctx: GraphQLContext, oracle: string): string {
  const address = normalizeAddress(oracle);
  if (!address || address === ZERO_ADDRESS) {
    throw new Error("iv oracle must be a valid address");
  }
  return ctx.sdk.optionsMarket.interface.encodeFunctionData("setIvOracle", [address]);
}

export function buildOptionsMarketSetCollateralManager(ctx: GraphQLContext, manager: string): string {
  const address = normalizeAddress(manager);
  if (!address || address === ZERO_ADDRESS) {
    throw new Error("collateral manager must be a valid address");
  }
  return ctx.sdk.optionsMarket.interface.encodeFunctionData("setCollateralManager", [address]);
}

export function buildOptionsMarketSetLiquidityVault(ctx: GraphQLContext, vault: string): string {
  const address = normalizeAddress(vault);
  if (!address || address === ZERO_ADDRESS) {
    throw new Error("liquidity vault must be a valid address");
  }
  return ctx.sdk.optionsMarket.interface.encodeFunctionData("setLiquidityVault", [address]);
}

export function buildOptionsMarketSetInsuranceFund(ctx: GraphQLContext, fund: string): string {
  const address = normalizeAddress(fund);
  if (!address || address === ZERO_ADDRESS) {
    throw new Error("insurance fund must be a valid address");
  }
  return ctx.sdk.optionsMarket.interface.encodeFunctionData("setInsuranceFund", [address]);
}

export function buildOptionsMarketSetInsuranceFeeBps(ctx: GraphQLContext, feeBps: number): string {
  const fee = parseUint(feeBps, "feeBps", { max: 10_000 });
  return ctx.sdk.optionsMarket.interface.encodeFunctionData("setInsuranceFeeBps", [fee]);
}

type SettlementSharesInput = {
  vaultShareBps: number;
  insuranceShareBps: number;
};

export function buildOptionsMarketSetSettlementShares(ctx: GraphQLContext, input: SettlementSharesInput): string {
  const vaultShare = parseUint(input.vaultShareBps, "vaultShareBps", { max: 10_000 });
  const insuranceShare = parseUint(input.insuranceShareBps, "insuranceShareBps", { max: 10_000 });
  if (vaultShare + insuranceShare > 10_000) {
    throw new Error("sum of settlement shares must be <= 10000 bps");
  }
  return ctx.sdk.optionsMarket.interface.encodeFunctionData("setSettlementShares", [vaultShare, insuranceShare]);
}

/* ----------------------- Collateral Manager Admin ----------------------- */

type CollateralMarginParamsInput = {
  initialBps: number;
  maintenanceBps: number;
  gracePeriod: number;
};

export function buildCollateralSetMarginParameters(ctx: GraphQLContext, input: CollateralMarginParamsInput): string {
  const initial = parseUint(input.initialBps, "initialBps", { max: 50_000 });
  const maintenance = parseUint(input.maintenanceBps, "maintenanceBps", { max: 50_000 });
  if (initial < maintenance) {
    throw new Error("initialBps must be >= maintenanceBps");
  }
  const gracePeriod = parseUint(input.gracePeriod, "gracePeriod", { max: 4_294_967_295 });
  return ctx.sdk.collateralManager.interface.encodeFunctionData("setMarginParameters", [
    initial,
    maintenance,
    gracePeriod
  ]);
}

export function buildCollateralSetLiquidatableMarket(
  ctx: GraphQLContext,
  market: string,
  approved: boolean
): string {
  const address = normalizeAddress(market);
  if (!address || address === ZERO_ADDRESS) {
    throw new Error("market must be a valid address");
  }
  return ctx.sdk.collateralManager.interface.encodeFunctionData("setLiquidatableMarket", [address, Boolean(approved)]);
}

export function buildCollateralSetMaintenanceMargin(
  ctx: GraphQLContext,
  account: string,
  requirement: string
): string {
  const address = normalizeAddress(account);
  if (!address || address === ZERO_ADDRESS) {
    throw new Error("account must be a valid address");
  }
  const amount = parseBigInt(requirement, "requirement");
  return ctx.sdk.collateralManager.interface.encodeFunctionData("setMaintenanceMargin", [address, amount]);
}

export function buildCollateralPause(ctx: GraphQLContext): string {
  return ctx.sdk.collateralManager.interface.encodeFunctionData("pause");
}

export function buildCollateralUnpause(ctx: GraphQLContext): string {
  return ctx.sdk.collateralManager.interface.encodeFunctionData("unpause");
}

type CollateralLiquidationInput = {
  account: string;
  asset: string;
  amount: string;
};

export function buildCollateralForceLiquidation(ctx: GraphQLContext, input: CollateralLiquidationInput): string {
  const account = normalizeAddress(input.account);
  const asset = normalizeAddress(input.asset);
  if (!account || account === ZERO_ADDRESS) {
    throw new Error("account must be a valid address");
  }
  if (!asset || asset === ZERO_ADDRESS) {
    throw new Error("asset must be a valid address");
  }
  const amount = parseBigInt(input.amount, "amount");
  return ctx.sdk.collateralManager.interface.encodeFunctionData("forceLiquidation", [account, asset, amount]);
}

type CollateralMarginMovementInput = {
  account: string;
  amountWad: string;
  maintenanceDeltaWad: string;
};

export function buildCollateralLockMargin(ctx: GraphQLContext, input: CollateralMarginMovementInput): string {
  const account = normalizeAddress(input.account);
  if (!account || account === ZERO_ADDRESS) {
    throw new Error("account must be a valid address");
  }
  const amount = parseBigInt(input.amountWad, "amountWad");
  const maintenance = parseBigInt(input.maintenanceDeltaWad, "maintenanceDeltaWad");
  return ctx.sdk.collateralManager.interface.encodeFunctionData("lockMargin", [account, amount, maintenance]);
}

export function buildCollateralReleaseMargin(ctx: GraphQLContext, input: CollateralMarginMovementInput): string {
  const account = normalizeAddress(input.account);
  if (!account || account === ZERO_ADDRESS) {
    throw new Error("account must be a valid address");
  }
  const amount = parseBigInt(input.amountWad, "amountWad");
  const maintenance = parseBigInt(input.maintenanceDeltaWad, "maintenanceDeltaWad");
  return ctx.sdk.collateralManager.interface.encodeFunctionData("releaseMargin", [account, amount, maintenance]);
}

export function buildCollateralEvaluateAccount(ctx: GraphQLContext, account: string): string {
  const address = normalizeAddress(account);
  if (!address || address === ZERO_ADDRESS) {
    throw new Error("account must be a valid address");
  }
  return ctx.sdk.collateralManager.interface.encodeFunctionData("evaluateAccount", [address]);
}

export function buildCollateralResolveLiquidation(ctx: GraphQLContext, account: string): string {
  const address = normalizeAddress(account);
  if (!address || address === ZERO_ADDRESS) {
    throw new Error("account must be a valid address");
  }
  return ctx.sdk.collateralManager.interface.encodeFunctionData("resolveLiquidation", [address]);
}

type CollateralExecuteLiquidationInput = {
  market: string;
  seriesId: string;
  account: string;
  size: string;
  payoutRecipient?: string | null;
};

export function buildCollateralExecuteLiquidation(
  ctx: GraphQLContext,
  input: CollateralExecuteLiquidationInput
): string {
  const market = normalizeAddress(input.market);
  const account = normalizeAddress(input.account);
  if (!market || market === ZERO_ADDRESS) {
    throw new Error("market must be a valid address");
  }
  if (!account || account === ZERO_ADDRESS) {
    throw new Error("account must be a valid address");
  }
  const seriesId = normalizeSeriesId(input.seriesId);
  const size = parseBigInt(input.size, "size");
  const payout = input.payoutRecipient ? normalizeAddress(input.payoutRecipient) : ZERO_ADDRESS;
  return ctx.sdk.collateralManager.interface.encodeFunctionData("executeLiquidation", [
    market,
    seriesId,
    account,
    size,
    payout
  ]);
}

/* ----------------------- Liquidity Vault Admin ----------------------- */

export function buildVaultPause(ctx: GraphQLContext): string {
  return ctx.sdk.liquidityVault.interface.encodeFunctionData("pause");
}

export function buildVaultUnpause(ctx: GraphQLContext): string {
  return ctx.sdk.liquidityVault.interface.encodeFunctionData("unpause");
}

export function buildVaultSetHedgeReserveBps(ctx: GraphQLContext, newBps: number): string {
  const bps = parseUint(newBps, "newBps", { max: 10_000 });
  return ctx.sdk.liquidityVault.interface.encodeFunctionData("setHedgeReserveBps", [bps]);
}

export function buildVaultSetHedgeOperator(ctx: GraphQLContext, operator: string): string {
  const address = normalizeAddress(operator);
  if (!address || address === ZERO_ADDRESS) {
    throw new Error("operator must be a valid address");
  }
  return ctx.sdk.liquidityVault.interface.encodeFunctionData("setHedgeOperator", [address]);
}

type VaultTrancheConfigInput = {
  performanceFeeBps: number;
  managementFeeBps: number;
  withdrawalCooldown: number;
};

export function buildVaultSetTrancheConfig(ctx: GraphQLContext, input: VaultTrancheConfigInput): string {
  const performance = parseUint(input.performanceFeeBps, "performanceFeeBps", { max: 10_000 });
  const management = parseUint(input.managementFeeBps, "managementFeeBps", { max: 10_000 });
  const cooldown = parseUint(input.withdrawalCooldown, "withdrawalCooldown", { max: 4_294_967_295 });
  return ctx.sdk.liquidityVault.interface.encodeFunctionData("setTrancheConfig", [
    {
      performanceFeeBps: performance,
      managementFeeBps: management,
      withdrawalCooldown: cooldown
    }
  ]);
}

type VaultDefineTrancheInput = {
  trancheId: string;
  weightBps: number;
};

export function buildVaultDefineTranche(ctx: GraphQLContext, input: VaultDefineTrancheInput): string {
  const trancheId = normalizeBytes32(input.trancheId, "trancheId");
  const weight = parseUint(input.weightBps, "weightBps", { max: 10_000 });
  return ctx.sdk.liquidityVault.interface.encodeFunctionData("defineTranche", [trancheId, weight]);
}

type VaultPremiumHandlerInput = {
  handler: string;
  enabled: boolean;
};

export function buildVaultSetPremiumHandler(ctx: GraphQLContext, input: VaultPremiumHandlerInput): string {
  const handler = normalizeAddress(input.handler);
  if (!handler || handler === ZERO_ADDRESS) {
    throw new Error("handler must be a valid address");
  }
  return ctx.sdk.liquidityVault.interface.encodeFunctionData("setPremiumHandler", [handler, Boolean(input.enabled)]);
}

type VaultAssetAmountInput = {
  asset: string;
  amount: string;
};

export function buildVaultRecordPremium(ctx: GraphQLContext, input: VaultAssetAmountInput): string {
  const asset = normalizeAddress(input.asset);
  if (!asset || asset === ZERO_ADDRESS) {
    throw new Error("asset must be a valid address");
  }
  const amount = parseBigInt(input.amount, "amount");
  return ctx.sdk.liquidityVault.interface.encodeFunctionData("recordPremium", [asset, amount]);
}

export function buildVaultRecordLoss(ctx: GraphQLContext, input: VaultAssetAmountInput): string {
  const asset = normalizeAddress(input.asset);
  if (!asset || asset === ZERO_ADDRESS) {
    throw new Error("asset must be a valid address");
  }
  const amount = parseBigInt(input.amount, "amount");
  return ctx.sdk.liquidityVault.interface.encodeFunctionData("recordLoss", [asset, amount]);
}

export function buildVaultHandleSettlement(ctx: GraphQLContext, input: VaultAssetAmountInput): string {
  const asset = normalizeAddress(input.asset);
  if (!asset || asset === ZERO_ADDRESS) {
    throw new Error("asset must be a valid address");
  }
  const amount = parseBigInt(input.amount, "amount");
  return ctx.sdk.liquidityVault.interface.encodeFunctionData("handleSettlementPayout", [asset, amount]);
}

type VaultClaimTrancheInput = {
  trancheId: string;
  recipient: string;
};

export function buildVaultClaimTranche(ctx: GraphQLContext, input: VaultClaimTrancheInput): string {
  const trancheId = normalizeBytes32(input.trancheId, "trancheId");
  const recipient = normalizeAddress(input.recipient);
  if (!recipient || recipient === ZERO_ADDRESS) {
    throw new Error("recipient must be a valid address");
  }
  return ctx.sdk.liquidityVault.interface.encodeFunctionData("claimTranche", [trancheId, recipient]);
}

export function buildVaultClaimProtocolReserve(ctx: GraphQLContext, recipient: string): string {
  const address = normalizeAddress(recipient);
  if (!address || address === ZERO_ADDRESS) {
    throw new Error("recipient must be a valid address");
  }
  return ctx.sdk.liquidityVault.interface.encodeFunctionData("claimProtocolReserve", [address]);
}

export function buildVaultAccruePerformanceFee(ctx: GraphQLContext, amount: string): string {
  const wad = parseBigInt(amount, "amount");
  return ctx.sdk.liquidityVault.interface.encodeFunctionData("accruePerformanceFee", [wad]);
}

export function buildVaultAccrueManagementFee(ctx: GraphQLContext, amount: string): string {
  const wad = parseBigInt(amount, "amount");
  return ctx.sdk.liquidityVault.interface.encodeFunctionData("accrueManagementFee", [wad]);
}

type VaultHedgeRequestInput = {
  amount: string;
  recipient: string;
};

export function buildVaultRequestHedgeFunds(ctx: GraphQLContext, input: VaultHedgeRequestInput): string {
  const amount = parseBigInt(input.amount, "amount");
  const recipient = normalizeAddress(input.recipient);
  if (!recipient || recipient === ZERO_ADDRESS) {
    throw new Error("recipient must be a valid address");
  }
  return ctx.sdk.liquidityVault.interface.encodeFunctionData("requestHedgeFunds", [amount, recipient]);
}

export function buildVaultReturnHedgeProfit(ctx: GraphQLContext, amount: string): string {
  const wad = parseBigInt(amount, "amount");
  return ctx.sdk.liquidityVault.interface.encodeFunctionData("returnHedgeProfit", [wad]);
}

/* ----------------------- Insurance Fund Admin ----------------------- */

export function buildInsuranceSetAssetApproval(ctx: GraphQLContext, asset: string, approved: boolean): string {
  const address = normalizeAddress(asset);
  if (!address || address === ZERO_ADDRESS) {
    throw new Error("asset must be a valid address");
  }
  return ctx.sdk.insuranceFund.interface.encodeFunctionData("setAssetApproval", [address, Boolean(approved)]);
}

export function buildInsuranceSetMarket(ctx: GraphQLContext, market: string, enabled: boolean): string {
  const address = normalizeAddress(market);
  if (!address || address === ZERO_ADDRESS) {
    throw new Error("market must be a valid address");
  }
  return ctx.sdk.insuranceFund.interface.encodeFunctionData("setMarket", [address, Boolean(enabled)]);
}

export function buildInsuranceDeposit(ctx: GraphQLContext, asset: string, amount: string): string {
  const address = normalizeAddress(asset);
  if (!address || address === ZERO_ADDRESS) {
    throw new Error("asset must be a valid address");
  }
  const wad = parseBigInt(amount, "amount");
  return ctx.sdk.insuranceFund.interface.encodeFunctionData("deposit", [address, wad]);
}

export function buildInsuranceNotifyPremium(ctx: GraphQLContext, asset: string, amount: string): string {
  const address = normalizeAddress(asset);
  if (!address || address === ZERO_ADDRESS) {
    throw new Error("asset must be a valid address");
  }
  const wad = parseBigInt(amount, "amount");
  return ctx.sdk.insuranceFund.interface.encodeFunctionData("notifyPremium", [address, wad]);
}

type InsuranceTransferInput = {
  asset: string;
  amount: string;
  recipient: string;
};

export function buildInsuranceRequestCoverage(ctx: GraphQLContext, input: InsuranceTransferInput): string {
  const asset = normalizeAddress(input.asset);
  const recipient = normalizeAddress(input.recipient);
  if (!asset || asset === ZERO_ADDRESS) {
    throw new Error("asset must be a valid address");
  }
  if (!recipient || recipient === ZERO_ADDRESS) {
    throw new Error("recipient must be a valid address");
  }
  const amount = parseBigInt(input.amount, "amount");
  return ctx.sdk.insuranceFund.interface.encodeFunctionData("requestCoverage", [asset, amount, recipient]);
}

export function buildInsuranceWithdraw(ctx: GraphQLContext, input: InsuranceTransferInput): string {
  const asset = normalizeAddress(input.asset);
  const recipient = normalizeAddress(input.recipient);
  if (!asset || asset === ZERO_ADDRESS) {
    throw new Error("asset must be a valid address");
  }
  if (!recipient || recipient === ZERO_ADDRESS) {
    throw new Error("recipient must be a valid address");
  }
  const amount = parseBigInt(input.amount, "amount");
  return ctx.sdk.insuranceFund.interface.encodeFunctionData("withdraw", [asset, amount, recipient]);
}

export function buildInsuranceRescue(ctx: GraphQLContext, input: InsuranceTransferInput): string {
  const asset = normalizeAddress(input.asset);
  const recipient = normalizeAddress(input.recipient);
  if (!asset || asset === ZERO_ADDRESS) {
    throw new Error("asset must be a valid address");
  }
  if (!recipient || recipient === ZERO_ADDRESS) {
    throw new Error("recipient must be a valid address");
  }
  const amount = parseBigInt(input.amount, "amount");
  return ctx.sdk.insuranceFund.interface.encodeFunctionData("rescue", [asset, amount, recipient]);
}

/* ----------------------- Option Token Admin ----------------------- */

export function buildOptionTokenSetBaseUri(ctx: GraphQLContext, uri: string): string {
  if (!uri || uri.trim().length === 0) {
    throw new Error("uri must be provided");
  }
  return ctx.sdk.optionToken.interface.encodeFunctionData("setBaseURI", [uri]);
}

export function buildOptionTokenGrantRoles(ctx: GraphQLContext, account: string): string {
  const address = normalizeAddress(account);
  if (!address || address === ZERO_ADDRESS) {
    throw new Error("account must be a valid address");
  }
  return ctx.sdk.optionToken.interface.encodeFunctionData("grantRoles", [address]);
}

export function buildOptionTokenRevokeRoles(ctx: GraphQLContext, account: string): string {
  const address = normalizeAddress(account);
  if (!address || address === ZERO_ADDRESS) {
    throw new Error("account must be a valid address");
  }
  return ctx.sdk.optionToken.interface.encodeFunctionData("revokeRoles", [address]);
}
