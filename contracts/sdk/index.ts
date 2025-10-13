import { Contract, ContractRunner } from "ethers";

import deployments from "../deployments/localhost.json";

import OptionTokenArtifact from "../artifacts/src/OptionToken.sol/OptionToken.json";
import CollateralManagerArtifact from "../artifacts/src/CollateralManager.sol/CollateralManager.json";
import LiquidityVaultArtifact from "../artifacts/src/LiquidityVault.sol/LiquidityVault.json";
import InsuranceFundArtifact from "../artifacts/src/InsuranceFund.sol/InsuranceFund.json";
import OptionsMarketArtifact from "../artifacts/src/mocks/OptionsMarketHarness.sol/OptionsMarketHarness.json";
import FlexibleOracleArtifact from "../artifacts/src/mocks/FlexibleOracleRouter.sol/FlexibleOracleRouter.json";
import MockIVOracleArtifact from "../artifacts/src/mocks/MockIVOracle.sol/MockIVOracle.json";
import MockERC20Artifact from "../artifacts/src/mocks/MockERC20.sol/MockERC20.json";

export type DeploymentAddresses = typeof deployments;

export const addresses: DeploymentAddresses = deployments;

export function getOptionToken(runner: ContractRunner): Contract {
  return new Contract(addresses.optionToken, OptionTokenArtifact.abi, runner);
}

export function getCollateralManager(runner: ContractRunner): Contract {
  return new Contract(addresses.collateralManager, CollateralManagerArtifact.abi, runner);
}

export function getLiquidityVault(runner: ContractRunner): Contract {
  return new Contract(addresses.liquidityVault, LiquidityVaultArtifact.abi, runner);
}

export function getInsuranceFund(runner: ContractRunner): Contract {
  return new Contract(addresses.insuranceFund, InsuranceFundArtifact.abi, runner);
}

export function getOptionsMarket(runner: ContractRunner): Contract {
  return new Contract(addresses.optionsMarket, OptionsMarketArtifact.abi, runner);
}

export function getOracleRouter(runner: ContractRunner): Contract {
  return new Contract(addresses.oracleRouter, FlexibleOracleArtifact.abi, runner);
}

export function getIvOracle(runner: ContractRunner): Contract {
  return new Contract(addresses.ivOracle, MockIVOracleArtifact.abi, runner);
}

export function getQuoteToken(runner: ContractRunner): Contract {
  return new Contract(addresses.quoteToken, MockERC20Artifact.abi, runner);
}

export function getUnderlyingToken(runner: ContractRunner): Contract {
  return new Contract(addresses.underlyingToken, MockERC20Artifact.abi, runner);
}

export function createSdk(runner: ContractRunner) {
  return {
    addresses,
    optionToken: getOptionToken(runner),
    collateralManager: getCollateralManager(runner),
    liquidityVault: getLiquidityVault(runner),
    insuranceFund: getInsuranceFund(runner),
    optionsMarket: getOptionsMarket(runner),
    oracleRouter: getOracleRouter(runner),
    ivOracle: getIvOracle(runner),
    quoteToken: getQuoteToken(runner),
    underlyingToken: getUnderlyingToken(runner)
  };
}
