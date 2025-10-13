import "dotenv/config";

import { Contract, ethers } from "ethers";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

type JsonArtifact = { abi: any };

const deployments = require("../../../contracts/deployments/localhost.json");
const OptionTokenArtifact = require("../../../contracts/artifacts/src/OptionToken.sol/OptionToken.json") as JsonArtifact;
const CollateralManagerArtifact = require("../../../contracts/artifacts/src/CollateralManager.sol/CollateralManager.json") as JsonArtifact;
const LiquidityVaultArtifact = require("../../../contracts/artifacts/src/LiquidityVault.sol/LiquidityVault.json") as JsonArtifact;
const InsuranceFundArtifact = require("../../../contracts/artifacts/src/InsuranceFund.sol/InsuranceFund.json") as JsonArtifact;
const OptionsMarketArtifact = require("../../../contracts/artifacts/src/mocks/OptionsMarketHarness.sol/OptionsMarketHarness.json") as JsonArtifact;
const FlexibleOracleArtifact = require("../../../contracts/artifacts/src/mocks/FlexibleOracleRouter.sol/FlexibleOracleRouter.json") as JsonArtifact;
const MockIVOracleArtifact = require("../../../contracts/artifacts/src/mocks/MockIVOracle.sol/MockIVOracle.json") as JsonArtifact;
const MockERC20Artifact = require("../../../contracts/artifacts/src/mocks/MockERC20.sol/MockERC20.json") as JsonArtifact;

export const addresses = deployments;

export const rpcUrl = process.env.RPC_URL ?? "http://127.0.0.1:8545";
export const provider = new ethers.JsonRpcProvider(rpcUrl);

export function createSdk(runner: ethers.ContractRunner) {
  return {
    addresses,
    optionToken: new Contract(addresses.optionToken, OptionTokenArtifact.abi, runner),
    collateralManager: new Contract(addresses.collateralManager, CollateralManagerArtifact.abi, runner),
    liquidityVault: new Contract(addresses.liquidityVault, LiquidityVaultArtifact.abi, runner),
    insuranceFund: new Contract(addresses.insuranceFund, InsuranceFundArtifact.abi, runner),
    optionsMarket: new Contract(addresses.optionsMarket, OptionsMarketArtifact.abi, runner),
    oracleRouter: new Contract(addresses.oracleRouter, FlexibleOracleArtifact.abi, runner),
    ivOracle: new Contract(addresses.ivOracle, MockIVOracleArtifact.abi, runner),
    quoteToken: new Contract(addresses.quoteToken, MockERC20Artifact.abi, runner),
    underlyingToken: new Contract(addresses.underlyingToken, MockERC20Artifact.abi, runner)
  };
}

export const sdk = createSdk(provider);

export type ContractsSdk = ReturnType<typeof createSdk>;
