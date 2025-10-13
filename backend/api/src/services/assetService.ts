import { Prisma } from "@prisma/client";

import type { GraphQLContext } from "../context";
import type { AssetDTO } from "../graphql/types";
import { normalizeAddress } from "../utils/address";
import { ZERO_ADDRESS, UNKNOWN_SYMBOL } from "../utils/constants";

export const assetSelect = {
  id: true,
  symbol: true,
  decimals: true,
  metadata: true
} as const;

type AssetRecord = Prisma.AssetGetPayload<{ select: typeof assetSelect }>;

export async function listAssets(ctx: GraphQLContext): Promise<AssetDTO[]> {
  const records = await ctx.prisma.asset.findMany({
    select: assetSelect,
    orderBy: { symbol: "asc" }
  });
  return records.map((record) => formatAsset(record));
}

export async function getAsset(ctx: GraphQLContext, id: string): Promise<AssetDTO | null> {
  const normalizedId = normalizeAddress(id);
  const record = await ctx.prisma.asset.findUnique({
    where: { id: normalizedId },
    select: assetSelect
  });
  return record ? formatAsset(record) : null;
}

export function formatAsset(asset: AssetRecord | null | undefined, fallbackId?: string): AssetDTO {
  const id = asset?.id ?? (fallbackId ? normalizeAddress(fallbackId) : ZERO_ADDRESS);
  const symbol = asset?.symbol ?? UNKNOWN_SYMBOL;
  const decimals = asset?.decimals ?? 18;
  const metadata = asset?.metadata ? JSON.stringify(asset?.metadata) : null;
  return { id, symbol, decimals, metadata };
}
