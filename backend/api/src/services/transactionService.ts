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
