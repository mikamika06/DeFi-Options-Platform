import { gql } from "urql";

// OptionsMarket mutations
export const CREATE_SERIES_CALLDATA_MUTATION = gql`
  mutation CreateSeriesCalldata($input: CreateSeriesInput!) {
    createSeriesCalldata(input: $input)
  }
`;

export const IV_UPDATE_CALLDATA_MUTATION = gql`
  mutation IvUpdateCalldata($input: IvUpdateInput!) {
    ivUpdateCalldata(input: $input)
  }
`;

export const SETTLE_SERIES_CALLDATA_MUTATION = gql`
  mutation SettleSeriesCalldata($input: SettleSeriesInput!) {
    settleSeriesCalldata(input: $input)
  }
`;

export const OPTIONS_MARKET_SET_FEE_RECIPIENT_MUTATION = gql`
  mutation OptionsMarketSetFeeRecipient($address: String!) {
    optionsMarketSetFeeRecipient(address: $address)
  }
`;

export const OPTIONS_MARKET_SET_ORACLE_ROUTER_MUTATION = gql`
  mutation OptionsMarketSetOracleRouter($address: String!) {
    optionsMarketSetOracleRouter(address: $address)
  }
`;

export const OPTIONS_MARKET_SET_IV_ORACLE_MUTATION = gql`
  mutation OptionsMarketSetIvOracle($address: String!) {
    optionsMarketSetIvOracle(address: $address)
  }
`;

export const OPTIONS_MARKET_SET_COLLATERAL_MANAGER_MUTATION = gql`
  mutation OptionsMarketSetCollateralManager($address: String!) {
    optionsMarketSetCollateralManager(address: $address)
  }
`;

export const OPTIONS_MARKET_SET_LIQUIDITY_VAULT_MUTATION = gql`
  mutation OptionsMarketSetLiquidityVault($address: String!) {
    optionsMarketSetLiquidityVault(address: $address)
  }
`;

export const OPTIONS_MARKET_SET_INSURANCE_FUND_MUTATION = gql`
  mutation OptionsMarketSetInsuranceFund($address: String!) {
    optionsMarketSetInsuranceFund(address: $address)
  }
`;

export const OPTIONS_MARKET_SET_INSURANCE_FEE_MUTATION = gql`
  mutation OptionsMarketSetInsuranceFeeBps($feeBps: Int!) {
    optionsMarketSetInsuranceFeeBps(feeBps: $feeBps)
  }
`;

export const OPTIONS_MARKET_SET_SETTLEMENT_SHARES_MUTATION = gql`
  mutation OptionsMarketSetSettlementShares(
    $input: OptionsMarketSettlementSharesInput!
  ) {
    optionsMarketSetSettlementShares(input: $input)
  }
`;

// CollateralManager mutations
export const COLLATERAL_SET_PRICE_MUTATION = gql`
  mutation CollateralSetPriceCalldata($input: CollateralPriceInput!) {
    collateralSetPriceCalldata(input: $input)
  }
`;

export const COLLATERAL_SET_CONFIG_MUTATION = gql`
  mutation CollateralSetConfigCalldata($input: CollateralAssetConfigInput!) {
    collateralSetConfigCalldata(input: $input)
  }
`;

export const COLLATERAL_SET_MARGIN_PARAMS_MUTATION = gql`
  mutation CollateralSetMarginParameters($input: CollateralMarginParamsInput!) {
    collateralSetMarginParameters(input: $input)
  }
`;

export const COLLATERAL_SET_LIQUIDATABLE_MARKET_MUTATION = gql`
  mutation CollateralSetLiquidatableMarket(
    $input: CollateralLiquidatableMarketInput!
  ) {
    collateralSetLiquidatableMarket(input: $input)
  }
`;

export const COLLATERAL_SET_MAINTENANCE_MARGIN_MUTATION = gql`
  mutation CollateralSetMaintenanceMargin($input: CollateralMaintenanceInput!) {
    collateralSetMaintenanceMargin(input: $input)
  }
`;

export const COLLATERAL_PAUSE_MUTATION = gql`
  mutation CollateralPause {
    collateralPause
  }
`;

export const COLLATERAL_UNPAUSE_MUTATION = gql`
  mutation CollateralUnpause {
    collateralUnpause
  }
`;

export const COLLATERAL_FORCE_LIQUIDATION_MUTATION = gql`
  mutation CollateralForceLiquidation($input: CollateralLiquidationInput!) {
    collateralForceLiquidation(input: $input)
  }
`;

export const COLLATERAL_LOCK_MARGIN_MUTATION = gql`
  mutation CollateralLockMargin($input: CollateralMarginMovementInput!) {
    collateralLockMargin(input: $input)
  }
`;

export const COLLATERAL_RELEASE_MARGIN_MUTATION = gql`
  mutation CollateralReleaseMargin($input: CollateralMarginMovementInput!) {
    collateralReleaseMargin(input: $input)
  }
`;

export const COLLATERAL_EVALUATE_ACCOUNT_MUTATION = gql`
  mutation CollateralEvaluateAccount($account: String!) {
    collateralEvaluateAccount(account: $account)
  }
`;

export const COLLATERAL_RESOLVE_LIQUIDATION_MUTATION = gql`
  mutation CollateralResolveLiquidation($account: String!) {
    collateralResolveLiquidation(account: $account)
  }
`;

export const COLLATERAL_EXECUTE_LIQUIDATION_MUTATION = gql`
  mutation CollateralExecuteLiquidation(
    $input: CollateralExecuteLiquidationInput!
  ) {
    collateralExecuteLiquidation(input: $input)
  }
`;

// LiquidityVault mutations
export const VAULT_PAUSE_MUTATION = gql`
  mutation VaultPause {
    vaultPause
  }
`;

export const VAULT_UNPAUSE_MUTATION = gql`
  mutation VaultUnpause {
    vaultUnpause
  }
`;

export const VAULT_SET_HEDGE_RESERVE_MUTATION = gql`
  mutation VaultSetHedgeReserveBps($newBps: Int!) {
    vaultSetHedgeReserveBps(newBps: $newBps)
  }
`;

export const VAULT_SET_HEDGE_OPERATOR_MUTATION = gql`
  mutation VaultSetHedgeOperator($operator: String!) {
    vaultSetHedgeOperator(operator: $operator)
  }
`;

export const VAULT_SET_TRANCHE_CONFIG_MUTATION = gql`
  mutation VaultSetTrancheConfig($input: VaultTrancheConfigInput!) {
    vaultSetTrancheConfig(input: $input)
  }
`;

export const VAULT_DEFINE_TRANCHE_MUTATION = gql`
  mutation VaultDefineTranche($input: VaultDefineTrancheInput!) {
    vaultDefineTranche(input: $input)
  }
`;

export const VAULT_SET_PREMIUM_HANDLER_MUTATION = gql`
  mutation VaultSetPremiumHandler($input: VaultPremiumHandlerInput!) {
    vaultSetPremiumHandler(input: $input)
  }
`;

export const VAULT_RECORD_PREMIUM_MUTATION = gql`
  mutation VaultRecordPremium($input: VaultAssetAmountInput!) {
    vaultRecordPremium(input: $input)
  }
`;

export const VAULT_RECORD_LOSS_MUTATION = gql`
  mutation VaultRecordLoss($input: VaultAssetAmountInput!) {
    vaultRecordLoss(input: $input)
  }
`;

export const VAULT_HANDLE_SETTLEMENT_MUTATION = gql`
  mutation VaultHandleSettlement($input: VaultAssetAmountInput!) {
    vaultHandleSettlement(input: $input)
  }
`;

export const VAULT_CLAIM_TRANCHE_MUTATION = gql`
  mutation VaultClaimTranche($input: VaultClaimTrancheInput!) {
    vaultClaimTranche(input: $input)
  }
`;

export const VAULT_CLAIM_PROTOCOL_RESERVE_MUTATION = gql`
  mutation VaultClaimProtocolReserve($recipient: String!) {
    vaultClaimProtocolReserve(recipient: $recipient)
  }
`;

export const VAULT_ACCRUE_PERFORMANCE_FEE_MUTATION = gql`
  mutation VaultAccruePerformanceFee($amount: String!) {
    vaultAccruePerformanceFee(amount: $amount)
  }
`;

export const VAULT_ACCRUE_MANAGEMENT_FEE_MUTATION = gql`
  mutation VaultAccrueManagementFee($amount: String!) {
    vaultAccrueManagementFee(amount: $amount)
  }
`;

export const VAULT_REQUEST_HEDGE_FUNDS_MUTATION = gql`
  mutation VaultRequestHedgeFunds($input: VaultHedgeRequestInput!) {
    vaultRequestHedgeFunds(input: $input)
  }
`;

export const VAULT_RETURN_HEDGE_PROFIT_MUTATION = gql`
  mutation VaultReturnHedgeProfit($amount: String!) {
    vaultReturnHedgeProfit(amount: $amount)
  }
`;

// InsuranceFund mutations
export const INSURANCE_SET_ASSET_APPROVAL_MUTATION = gql`
  mutation InsuranceSetAssetApproval($input: InsuranceApprovalInput!) {
    insuranceSetAssetApproval(input: $input)
  }
`;

export const INSURANCE_SET_MARKET_MUTATION = gql`
  mutation InsuranceSetMarket($input: InsuranceMarketInput!) {
    insuranceSetMarket(input: $input)
  }
`;

export const INSURANCE_DEPOSIT_MUTATION = gql`
  mutation InsuranceDeposit($input: InsuranceAmountInput!) {
    insuranceDeposit(input: $input)
  }
`;

export const INSURANCE_NOTIFY_PREMIUM_MUTATION = gql`
  mutation InsuranceNotifyPremium($input: InsuranceAmountInput!) {
    insuranceNotifyPremium(input: $input)
  }
`;

export const INSURANCE_REQUEST_COVERAGE_MUTATION = gql`
  mutation InsuranceRequestCoverage($input: InsuranceTransferInput!) {
    insuranceRequestCoverage(input: $input)
  }
`;

export const INSURANCE_WITHDRAW_MUTATION = gql`
  mutation InsuranceWithdraw($input: InsuranceTransferInput!) {
    insuranceWithdraw(input: $input)
  }
`;

export const INSURANCE_RESCUE_MUTATION = gql`
  mutation InsuranceRescue($input: InsuranceTransferInput!) {
    insuranceRescue(input: $input)
  }
`;

// OptionToken mutations
export const OPTION_TOKEN_SET_BASE_URI_MUTATION = gql`
  mutation OptionTokenSetBaseUri($uri: String!) {
    optionTokenSetBaseUri(uri: $uri)
  }
`;

export const OPTION_TOKEN_GRANT_ROLES_MUTATION = gql`
  mutation OptionTokenGrantRoles($account: String!) {
    optionTokenGrantRoles(account: $account)
  }
`;

export const OPTION_TOKEN_REVOKE_ROLES_MUTATION = gql`
  mutation OptionTokenRevokeRoles($account: String!) {
    optionTokenRevokeRoles(account: $account)
  }
`;

// Other mutations
export const GRANT_ROLE_MUTATION = gql`
  mutation GrantRoleCalldata($input: GrantRoleInput!) {
    grantRoleCalldata(input: $input)
  }
`;

export const ORACLE_SET_PRICE_MUTATION = gql`
  mutation OracleSetPriceCalldata($input: OraclePriceInput!) {
    oracleSetPriceCalldata(input: $input)
  }
`;
