export const typeDefs = /* GraphQL */ `
  enum OptionType {
    CALL
    PUT
  }

  type Asset {
    id: String!
    symbol: String!
    decimals: Int!
    metadata: String
  }

  type SeriesMetrics {
    markIv: String
    markDelta: String
    markGamma: String
    markVega: String
    markTheta: String
    markRho: String
    lastQuoteAt: String
    lastTradeAt: String
    updatedAt: String
    oiLong: String
    oiShort: String
    openInterestUsd: String
    utilizationRatio: String
  }

  type Series {
    id: String!
    optionType: OptionType!
    strikeWad: String!
    expiry: String!
    baseFeeBps: Int!
    isSettled: Boolean!
    createdAt: String
    lastIvUpdateAt: String
    underlying: Asset!
    quote: Asset!
    longOpenInterest: String!
    shortOpenInterest: String!
    totalPremiumCollected: String!
    metrics: SeriesMetrics
  }

  type Quote {
    premium: String!
    fee: String!
  }

  type Trade {
    id: String!
    series: Series!
    seriesId: String!
    userAddress: String!
    side: String!
    sizeWad: String!
    premiumWad: String!
    feeWad: String!
    txHash: String!
    blockNumber: String!
    timestamp: String!
  }

  type Position {
    id: String!
    series: Series!
    seriesId: String!
    userAddress: String!
    positionType: String!
    sizeWad: String!
    avgPriceWad: String!
    pnlUnrealizedWad: String!
    pnlRealizedWad: String!
    lastUpdated: String!
  }

  type PoolMetrics {
    hedgeReserveWad: String!
    protocolFeesWad: String!
    lastRebalanceAt: String
    updatedAt: String
  }

  type Pool {
    id: String!
    asset: Asset!
    tvlWad: String!
    utilization: String
    apy: String
    totalShares: String!
    createdAt: String
    updatedAt: String
    metrics: PoolMetrics
  }

  type LpPosition {
    pool: Pool!
    userAddress: String!
    shares: String!
    entryTvlWad: String!
    createdAt: String
    updatedAt: String
  }

  type RiskSnapshot {
    id: String!
    seriesId: String
    series: Series
    userAddress: String!
    netDelta: String
    netGamma: String
    netVega: String
    marginRequiredWad: String
    marginAvailableWad: String
    liquidationPrice: String
    alertLevel: String!
    timestamp: String!
  }

  type MarginEvent {
    id: String!
    seriesId: String
    series: Series
    userAddress: String!
    eventType: String!
    deltaWad: String!
    resultingMarginWad: String!
    metadata: String
    timestamp: String!
  }

  input SeriesFilterInput {
    underlyingId: String
    quoteAssetId: String
    optionType: OptionType
    expiryFrom: String
    expiryTo: String
  }

  input TradeFilterInput {
    seriesId: String
    userAddress: String
    side: String
  }

  input PositionFilterInput {
    userAddress: String!
    seriesId: String
    positionType: String
  }

  input RiskSnapshotFilterInput {
    userAddress: String!
    seriesId: String
    alertLevels: [String!]
    timestampFrom: String
    timestampTo: String
    limit: Int
  }

  input MarginEventFilterInput {
    userAddress: String!
    seriesId: String
    eventTypes: [String!]
    timestampFrom: String
    timestampTo: String
  }

  input PaginationInput {
    cursor: String
    limit: Int
  }

  input CreateSeriesInput {
    underlying: String!
    quote: String!
    strikeWad: String!
    expiry: String!
    isCall: Boolean!
    baseFeeBps: Int!
  }

  input LpDepositInput {
    assets: String!
    receiver: String!
  }

  input LpWithdrawInput {
    assets: String!
    receiver: String!
    owner: String!
  }

  input OpenShortInput {
    seriesId: String!
    size: String!
    recipient: String!
  }

  input CloseShortInput {
    seriesId: String!
    size: String!
  }

  input CollateralMoveInput {
    account: String!
    asset: String!
    amount: String!
  }

  input CollateralPriceInput {
    asset: String!
    priceWad: String!
  }

  input CollateralAssetConfigInput {
    asset: String!
    isEnabled: Boolean!
    collateralFactorBps: Int!
    liquidationThresholdBps: Int!
    decimals: Int!
  }

  input CollateralMarginParamsInput {
    initialBps: Int!
    maintenanceBps: Int!
    gracePeriod: Int!
  }

  input CollateralLiquidatableMarketInput {
    market: String!
    approved: Boolean!
  }

  input CollateralMaintenanceInput {
    account: String!
    requirement: String!
  }

  input CollateralMarginMovementInput {
    account: String!
    amountWad: String!
    maintenanceDeltaWad: String!
  }

  input CollateralLiquidationInput {
    account: String!
    asset: String!
    amount: String!
  }

  input CollateralExecuteLiquidationInput {
    market: String!
    seriesId: String!
    account: String!
    size: String!
    payoutRecipient: String
  }

  input GrantRoleInput {
    contract: String!
    role: String!
    account: String!
  }

  input OraclePriceInput {
    asset: String!
    price: String!
    decimals: Int!
  }

  input OptionsMarketSettlementSharesInput {
    vaultShareBps: Int!
    insuranceShareBps: Int!
  }

  input SettleSeriesInput {
    seriesId: String!
    residualRecipient: String
  }

  input LiquidationInput {
    seriesId: String!
    account: String!
    size: String!
    receiver: String
  }

  input MarginCheckInput {
    account: String!
    seriesId: String
    size: String
    receiver: String
  }

  input IvUpdateInput {
    seriesId: String!
    ivWad: String!
  }

  input VaultTrancheConfigInput {
    performanceFeeBps: Int!
    managementFeeBps: Int!
    withdrawalCooldown: Int!
  }

  input VaultDefineTrancheInput {
    trancheId: String!
    weightBps: Int!
  }

  input VaultPremiumHandlerInput {
    handler: String!
    enabled: Boolean!
  }

  input VaultAssetAmountInput {
    asset: String!
    amount: String!
  }

  input VaultClaimTrancheInput {
    trancheId: String!
    recipient: String!
  }

  input VaultHedgeRequestInput {
    amount: String!
    recipient: String!
  }

  input InsuranceApprovalInput {
    asset: String!
    approved: Boolean!
  }

  input InsuranceMarketInput {
    market: String!
    enabled: Boolean!
  }

  input InsuranceAmountInput {
    asset: String!
    amount: String!
  }

  input InsuranceTransferInput {
    asset: String!
    amount: String!
    recipient: String!
  }

  type TradeConnection {
    items: [Trade!]!
    nextCursor: String
  }

  type MarginEventConnection {
    items: [MarginEvent!]!
    nextCursor: String
  }

  type Query {
    assets: [Asset!]!
    asset(id: String!): Asset
    series(filter: SeriesFilterInput): [Series!]!
    seriesById(id: String!): Series
    pools: [Pool!]!
    pool(id: String!): Pool
    lpPositions(userAddress: String!): [LpPosition!]!
    trades(filter: TradeFilterInput, pagination: PaginationInput): TradeConnection!
    positions(filter: PositionFilterInput!): [Position!]!
    riskSnapshots(filter: RiskSnapshotFilterInput!): [RiskSnapshot!]!
    marginEvents(filter: MarginEventFilterInput!, pagination: PaginationInput): MarginEventConnection!
    quote(seriesId: String!, size: String!): Quote!
  }

  type Mutation {
    tradeCalldata(seriesId: String!, size: String!, maxPremium: String!): String!
    exerciseCalldata(seriesId: String!, size: String!, minPayout: String!): String!
    lpDepositCalldata(input: LpDepositInput!): String!
    lpWithdrawCalldata(input: LpWithdrawInput!): String!
    openShortCalldata(input: OpenShortInput!): String!
    closeShortCalldata(input: CloseShortInput!): String!
    collateralDepositCalldata(input: CollateralMoveInput!): String!
    collateralWithdrawCalldata(input: CollateralMoveInput!): String!
    collateralSetPriceCalldata(input: CollateralPriceInput!): String!
    collateralSetConfigCalldata(input: CollateralAssetConfigInput!): String!
    collateralSetMarginParameters(input: CollateralMarginParamsInput!): String!
    collateralSetLiquidatableMarket(input: CollateralLiquidatableMarketInput!): String!
    collateralSetMaintenanceMargin(input: CollateralMaintenanceInput!): String!
    collateralPause: String!
    collateralUnpause: String!
    collateralForceLiquidation(input: CollateralLiquidationInput!): String!
    collateralLockMargin(input: CollateralMarginMovementInput!): String!
    collateralReleaseMargin(input: CollateralMarginMovementInput!): String!
    collateralEvaluateAccount(account: String!): String!
    collateralResolveLiquidation(account: String!): String!
    collateralExecuteLiquidation(input: CollateralExecuteLiquidationInput!): String!
    grantRoleCalldata(input: GrantRoleInput!): String!
    oracleSetPriceCalldata(input: OraclePriceInput!): String!
    createSeriesCalldata(input: CreateSeriesInput!): String!
    optionsMarketSetFeeRecipient(address: String!): String!
    optionsMarketSetOracleRouter(address: String!): String!
    optionsMarketSetIvOracle(address: String!): String!
    optionsMarketSetCollateralManager(address: String!): String!
    optionsMarketSetLiquidityVault(address: String!): String!
    optionsMarketSetInsuranceFund(address: String!): String!
    optionsMarketSetInsuranceFeeBps(feeBps: Int!): String!
    optionsMarketSetSettlementShares(input: OptionsMarketSettlementSharesInput!): String!
    vaultPause: String!
    vaultUnpause: String!
    vaultSetHedgeReserveBps(newBps: Int!): String!
    vaultSetHedgeOperator(operator: String!): String!
    vaultSetTrancheConfig(input: VaultTrancheConfigInput!): String!
    vaultDefineTranche(input: VaultDefineTrancheInput!): String!
    vaultSetPremiumHandler(input: VaultPremiumHandlerInput!): String!
    vaultRecordPremium(input: VaultAssetAmountInput!): String!
    vaultRecordLoss(input: VaultAssetAmountInput!): String!
    vaultHandleSettlement(input: VaultAssetAmountInput!): String!
    vaultClaimTranche(input: VaultClaimTrancheInput!): String!
    vaultClaimProtocolReserve(recipient: String!): String!
    vaultAccruePerformanceFee(amount: String!): String!
    vaultAccrueManagementFee(amount: String!): String!
    vaultRequestHedgeFunds(input: VaultHedgeRequestInput!): String!
    vaultReturnHedgeProfit(amount: String!): String!
    insuranceSetAssetApproval(input: InsuranceApprovalInput!): String!
    insuranceSetMarket(input: InsuranceMarketInput!): String!
    insuranceDeposit(input: InsuranceAmountInput!): String!
    insuranceNotifyPremium(input: InsuranceAmountInput!): String!
    insuranceRequestCoverage(input: InsuranceTransferInput!): String!
    insuranceWithdraw(input: InsuranceTransferInput!): String!
    insuranceRescue(input: InsuranceTransferInput!): String!
    optionTokenSetBaseUri(uri: String!): String!
    optionTokenGrantRoles(account: String!): String!
    optionTokenRevokeRoles(account: String!): String!
    settleSeriesCalldata(input: SettleSeriesInput!): String!
    enqueueRiskSnapshot(userAddress: String!): String!
    settleSeriesExecute(seriesId: String!, residualRecipient: String): String!
    enqueueSettlement(seriesId: String!, residualRecipient: String): String!
    liquidatePositionExecute(input: LiquidationInput!): String!
    enqueueLiquidation(input: LiquidationInput!): String!
    enqueueMarginCheck(input: MarginCheckInput!): String!
    ivUpdateCalldata(input: IvUpdateInput!): String!
    ivUpdateExecute(input: IvUpdateInput!): String!
    enqueueIvUpdate(input: IvUpdateInput!): String!
    enqueueGreeks(seriesId: String!): String!
  }
`;
