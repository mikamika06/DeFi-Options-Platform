import { Wallet } from "ethers";

import { provider, sdk } from "../sdk";

const keeperKey = process.env.KEEPER_PRIVATE_KEY;

let cachedSigner: Wallet | null = null;

export function getKeeperSigner(): Wallet {
  if (!keeperKey || keeperKey === "") {
    throw new Error("KEEPER_PRIVATE_KEY is not set");
  }
  if (!cachedSigner) {
    cachedSigner = new Wallet(keeperKey, provider);
  }
  return cachedSigner;
}

export function getKeeperOptionsMarket() {
  return sdk.optionsMarket.connect(getKeeperSigner());
}

export function getKeeperIvOracle() {
  return sdk.ivOracle.connect(getKeeperSigner());
}

export function getKeeperCollateralManager() {
  return sdk.collateralManager.connect(getKeeperSigner());
}
