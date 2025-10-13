export type OptionTypeValue = "CALL" | "PUT";

export type AssetDTO = {
  id: string;
  symbol: string;
  decimals: number;
  metadata: string | null;
};

export type SeriesMetricsDTO = {
  markIv: string | null;
  markDelta: string | null;
  markGamma: string | null;
  markVega: string | null;
  markTheta: string | null;
  markRho: string | null;
  lastQuoteAt: string | null;
  lastTradeAt: string | null;
  updatedAt: string | null;
  oiLong: string | null;
  oiShort: string | null;
  openInterestUsd: string | null;
  utilizationRatio: string | null;
};

export type SeriesDTO = {
  id: string;
  optionType: OptionTypeValue;
  strikeWad: string;
  expiry: string;
  baseFeeBps: number;
  isSettled: boolean;
  createdAt: string | null;
  lastIvUpdateAt: string | null;
  underlying: AssetDTO;
  quote: AssetDTO;
  longOpenInterest: string;
  shortOpenInterest: string;
  totalPremiumCollected: string;
  metrics: SeriesMetricsDTO | null;
};

export type SeriesFilterInput = {
  underlyingId?: string | null;
  quoteAssetId?: string | null;
  optionType?: OptionTypeValue | null;
  expiryFrom?: string | null;
  expiryTo?: string | null;
};

export type QuoteDTO = {
  premium: string;
  fee: string;
};

export type PoolMetricsDTO = {
  hedgeReserveWad: string;
  protocolFeesWad: string;
  lastRebalanceAt: string | null;
  updatedAt: string | null;
};

export type PoolDTO = {
  id: string;
  asset: AssetDTO;
  tvlWad: string;
  utilization: string | null;
  apy: string | null;
  totalShares: string;
  createdAt: string | null;
  updatedAt: string | null;
  metrics: PoolMetricsDTO | null;
};

export type LpPositionDTO = {
  pool: PoolDTO;
  userAddress: string;
  shares: string;
  entryTvlWad: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type TradeDTO = {
  id: string;
  seriesId: string;
  series: SeriesDTO;
  userAddress: string;
  side: string;
  sizeWad: string;
  premiumWad: string;
  feeWad: string;
  txHash: string;
  blockNumber: string;
  timestamp: string;
};

export type TradeFilterInput = {
  seriesId?: string | null;
  userAddress?: string | null;
  side?: string | null;
};

export type PaginationInput = {
  cursor?: string | null;
  limit?: number | null;
};

export type TradeConnectionDTO = {
  items: TradeDTO[];
  nextCursor: string | null;
};

export type PositionDTO = {
  id: string;
  seriesId: string;
  series: SeriesDTO;
  userAddress: string;
  positionType: string;
  sizeWad: string;
  avgPriceWad: string;
  pnlUnrealizedWad: string;
  pnlRealizedWad: string;
  lastUpdated: string;
};

export type PositionFilterInput = {
  userAddress: string;
  seriesId?: string | null;
  positionType?: string | null;
};

export type RiskSnapshotDTO = {
  id: string;
  seriesId: string | null;
  series: SeriesDTO | null;
  userAddress: string;
  netDelta: string | null;
  netGamma: string | null;
  netVega: string | null;
  marginRequiredWad: string | null;
  marginAvailableWad: string | null;
  liquidationPrice: string | null;
  alertLevel: string;
  timestamp: string;
};

export type RiskSnapshotFilterInput = {
  userAddress: string;
  seriesId?: string | null;
  alertLevels?: string[] | null;
  timestampFrom?: string | null;
  timestampTo?: string | null;
  limit?: number | null;
};

export type MarginEventDTO = {
  id: string;
  seriesId: string | null;
  series: SeriesDTO | null;
  userAddress: string;
  eventType: string;
  deltaWad: string;
  resultingMarginWad: string;
  metadata: string | null;
  timestamp: string;
};

export type MarginEventFilterInput = {
  userAddress: string;
  seriesId?: string | null;
  eventTypes?: string[] | null;
  timestampFrom?: string | null;
  timestampTo?: string | null;
};

export type MarginEventConnectionDTO = {
  items: MarginEventDTO[];
  nextCursor: string | null;
};
