import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pkg from "@prisma/client/default.js";
import { ethers } from "ethers";

const { PrismaClient, Prisma, OptionType } = pkg;
const prisma = new PrismaClient();

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type DeploymentAddresses = {
  underlyingToken?: string;
  quoteToken?: string;
  liquidityVault?: string;
  optionsMarket?: string;
};

type TokenMetadata = {
  symbol: string;
  decimals: number;
};

async function loadDeployments(): Promise<DeploymentAddresses | null> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "..", "..");

  const network = process.env.DEPLOYMENTS_NETWORK ?? "localhost";
  const customFile = process.env.DEPLOYMENTS_FILE;
  const deploymentsPath =
    customFile ??
    path.join(repoRoot, "contracts", "deployments", `${network}.json`);

  try {
    const file = await readFile(deploymentsPath, "utf8");
    return JSON.parse(file) as DeploymentAddresses;
  } catch (error) {
    console.warn(
      `[seed] Deployments file not found at ${deploymentsPath}: ${String(
        error
      )}`
    );
    return null;
  }
}

async function fetchTokenMetadata(
  provider: ethers.JsonRpcProvider,
  address: string | undefined,
  fallbackSymbol: string,
  fallbackDecimals: number
): Promise<TokenMetadata | null> {
  if (!address || address === ZERO_ADDRESS) return null;

  const minimalAbi = [
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
  ];
  const contract = new ethers.Contract(address, minimalAbi, provider);

  try {
    const [symbol, decimals] = await Promise.all([
      contract.symbol().catch(() => fallbackSymbol),
      contract.decimals().catch(() => fallbackDecimals),
    ]);
    return {
      symbol: symbol || fallbackSymbol,
      decimals: Number(decimals ?? fallbackDecimals),
    };
  } catch (error) {
    console.warn(
      `[seed] Failed to fetch metadata for ${address}: ${String(error)}`
    );
    return { symbol: fallbackSymbol, decimals: fallbackDecimals };
  }
}

async function upsertAsset(id: string, metadata: TokenMetadata) {
  const normalizedId = id.toLowerCase();
  await prisma.asset.upsert({
    where: { id: normalizedId },
    update: {
      symbol: metadata.symbol,
      decimals: metadata.decimals,
      updatedAt: new Date(),
    },
    create: {
      id: normalizedId,
      symbol: metadata.symbol,
      decimals: metadata.decimals,
    },
  });
}

async function ensurePool(liquidityVault: string, quoteAssetId: string) {
  const normalizedPool = liquidityVault.toLowerCase();
  await prisma.pool.upsert({
    where: { id: normalizedPool },
    update: {
      assetId: quoteAssetId.toLowerCase(),
    },
    create: {
      id: normalizedPool,
      assetId: quoteAssetId.toLowerCase(),
    },
  });
}

async function main() {
  const deployments = await loadDeployments();

  const rpcUrl =
    process.env.ANVIL_RPC_URL ?? process.env.RPC_URL ?? "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const underlyingMeta = await fetchTokenMetadata(
    provider,
    deployments?.underlyingToken,
    process.env.UNDERLYING_SYMBOL ?? "UNDERLYING",
    Number(process.env.UNDERLYING_DECIMALS ?? 18)
  );
  if (
    underlyingMeta &&
    deployments?.underlyingToken &&
    deployments.underlyingToken !== ZERO_ADDRESS
  ) {
    await upsertAsset(deployments.underlyingToken, underlyingMeta);
    console.log(`[seed] Upserted underlying asset ${underlyingMeta.symbol}`);
  }

  const quoteMeta = await fetchTokenMetadata(
    provider,
    deployments?.quoteToken,
    process.env.QUOTE_SYMBOL ?? "QUOTE",
    Number(process.env.QUOTE_DECIMALS ?? 6)
  );
  if (
    quoteMeta &&
    deployments?.quoteToken &&
    deployments.quoteToken !== ZERO_ADDRESS
  ) {
    await upsertAsset(deployments.quoteToken, quoteMeta);
    console.log(`[seed] Upserted quote asset ${quoteMeta.symbol}`);
  }

  if (
    deployments?.liquidityVault &&
    deployments.liquidityVault !== ZERO_ADDRESS &&
    deployments?.quoteToken &&
    deployments.quoteToken !== ZERO_ADDRESS
  ) {
    await ensurePool(deployments.liquidityVault, deployments.quoteToken);
    console.log(
      `[seed] Ensured liquidity pool record for ${deployments.liquidityVault}`
    );
  }

  if (
    deployments?.optionsMarket &&
    deployments.optionsMarket !== ZERO_ADDRESS
  ) {
    const normalizedMarket = deployments.optionsMarket.toLowerCase();
    await prisma.asset.upsert({
      where: { id: normalizedMarket },
      update: {
        symbol: "MARKET",
        decimals: 0,
      },
      create: {
        id: normalizedMarket,
        symbol: "MARKET",
        decimals: 0,
      },
    });
    console.log(
      `[seed] Ensured market reference asset for ${deployments.optionsMarket}`
    );
  }

  console.log("[seed] Completed Prisma seeding");
}

main()
  .catch((error) => {
    console.error("[seed] Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
