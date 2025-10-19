export type OptionSide = "CALL" | "PUT";

export type CreateSeriesFormState = {
  underlying: string;
  quote: string;
  strike: string;
  expiry: string;
  baseFeeBps: string;
  optionSide: OptionSide;
};

export type OptionsAddresses = {
  feeRecipient: string;
  oracleRouter: string;
  ivOracle: string;
  collateralManager: string;
  liquidityVault: string;
  insuranceFund: string;
};

export type SettlementShares = {
  vaultShareBps: string;
  insuranceShareBps: string;
};

export type MarginParams = {
  initialBps: string;
  maintenanceBps: string;
  gracePeriod: string;
};

export type LiquidatableMarketForm = {
  market: string;
  approved: boolean;
};

export type MaintenanceOverrideForm = {
  account: string;
  requirement: string;
};

export type MarginMovementForm = {
  account: string;
  amountWad: string;
  maintenanceDeltaWad: string;
};

export type ForceLiquidationForm = {
  account: string;
  asset: string;
  amount: string;
};

export type ExecuteLiquidationForm = {
  market: string;
  seriesId: string;
  account: string;
  size: string;
  payoutRecipient: string;
};

export type VaultTrancheConfig = {
  performanceFeeBps: string;
  managementFeeBps: string;
  withdrawalCooldown: string;
};

export type VaultDefineTrancheForm = {
  trancheId: string;
  weightBps: string;
};

export type VaultPremiumHandlerForm = {
  handler: string;
  enabled: boolean;
};

export type VaultAssetAmountForm = {
  asset: string;
  amount: string;
};

export type VaultClaimTrancheForm = {
  trancheId: string;
  recipient: string;
};

export type VaultHedgeRequestForm = {
  amount: string;
  recipient: string;
};

export type InsuranceApprovalForm = {
  asset: string;
  approved: boolean;
};

export type InsuranceMarketForm = {
  market: string;
  enabled: boolean;
};

export type InsuranceTransferForm = {
  asset: string;
  amount: string;
  recipient: string;
};

export type Asset = {
  id: string;
  symbol: string;
  decimals: number | null;
};
