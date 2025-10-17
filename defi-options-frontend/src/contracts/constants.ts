import deployments from "../../../contracts/deployments/localhost.json";
import { keccak256, stringToHex } from "viem";

const ensureAddress = (value: string | undefined, fallback: string) =>
  value && value.startsWith("0x") ? value : fallback;

const roleHash = (role: string) => keccak256(stringToHex(role));

export const DEPLOYMENT_ADDRESSES = deployments;

export const OPTIONS_MARKET_ADDRESS = ensureAddress(
  process.env.NEXT_PUBLIC_OPTIONS_MARKET_ADDRESS,
  deployments.optionsMarket
);

export const IV_ORACLE_ADDRESS = ensureAddress(
  process.env.NEXT_PUBLIC_IV_ORACLE_ADDRESS,
  deployments.ivOracle
);

export const COLLATERAL_MANAGER_ADDRESS = ensureAddress(
  process.env.NEXT_PUBLIC_COLLATERAL_MANAGER_ADDRESS,
  deployments.collateralManager
);

export const LIQUIDITY_VAULT_ADDRESS = ensureAddress(
  process.env.NEXT_PUBLIC_LIQUIDITY_VAULT_ADDRESS,
  deployments.liquidityVault
);

export const INSURANCE_FUND_ADDRESS = ensureAddress(
  process.env.NEXT_PUBLIC_INSURANCE_FUND_ADDRESS,
  deployments.insuranceFund
);

export const ORACLE_ROUTER_ADDRESS = ensureAddress(
  process.env.NEXT_PUBLIC_ORACLE_ROUTER_ADDRESS,
  deployments.oracleRouter
);

export const QUOTE_TOKEN_ADDRESS = "0x19cEcCd6942ad38562Ee10bAfd44776ceB67e923";

export const DEFAULT_ADMIN_ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
export const IV_UPDATER_ROLE = roleHash("IV_UPDATER_ROLE");
export const KEEPER_ROLE = roleHash("KEEPER_ROLE");
export const RISK_MANAGER_ROLE = roleHash("RISK_MANAGER_ROLE");
export const LIQUIDATOR_ROLE = roleHash("LIQUIDATOR_ROLE");

export const COLLATERAL_MARGIN_ADMIN_ROLE = roleHash("MARGIN_ADMIN_ROLE");
export const COLLATERAL_LIQUIDATOR_ROLE = roleHash("LIQUIDATOR_ROLE");
export const COLLATERAL_MARGIN_ENGINE_ROLE = roleHash("MARGIN_ENGINE_ROLE");

export const VAULT_MANAGER_ROLE = roleHash("VAULT_MANAGER_ROLE");
export const VAULT_FEE_COLLECTOR_ROLE = roleHash("FEE_COLLECTOR_ROLE");
export const VAULT_PREMIUM_HANDLER_ROLE = roleHash("PREMIUM_HANDLER_ROLE");

export const INSURANCE_TREASURER_ROLE = roleHash("TREASURER_ROLE");
export const INSURANCE_STRATEGIST_ROLE = roleHash("STRATEGIST_ROLE");
export const INSURANCE_MARKET_ROLE = roleHash("MARKET_ROLE");

export type ContractRole =
  | typeof DEFAULT_ADMIN_ROLE
  | typeof IV_UPDATER_ROLE
  | typeof KEEPER_ROLE
  | typeof RISK_MANAGER_ROLE
  | typeof LIQUIDATOR_ROLE;
