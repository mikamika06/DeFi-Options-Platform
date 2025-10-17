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
