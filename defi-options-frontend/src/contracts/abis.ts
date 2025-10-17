import type { Abi } from "viem";
import OptionsMarketArtifact from "../../../contracts/artifacts/src/mocks/OptionsMarketHarness.sol/OptionsMarketHarness.json";
import MockIVOracleArtifact from "../../../contracts/artifacts/src/mocks/MockIVOracle.sol/MockIVOracle.json";
import CollateralManagerArtifact from "../../../contracts/artifacts/src/CollateralManager.sol/CollateralManager.json";

export const OptionsMarket_ABI = OptionsMarketArtifact.abi as Abi;
export const IVOracle_ABI = MockIVOracleArtifact.abi as Abi;
export const CollateralManager_ABI = CollateralManagerArtifact.abi as Abi;

export type OptionsMarketAbi = typeof OptionsMarket_ABI;
export type IvOracleAbi = typeof IVOracle_ABI;
export type CollateralManagerAbi = typeof CollateralManager_ABI;
