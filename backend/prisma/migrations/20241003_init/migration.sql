-- Create enums
CREATE TYPE "OptionType" AS ENUM ('CALL', 'PUT');
CREATE TYPE "TradeSide" AS ENUM ('BUY', 'SELL');
CREATE TYPE "PositionType" AS ENUM ('LONG', 'SHORT');
CREATE TYPE "RiskAlertLevel" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- Assets table
CREATE TABLE "Asset" (
    "id" VARCHAR(64) PRIMARY KEY,
    "symbol" VARCHAR(32) NOT NULL,
    "decimals" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Series table
CREATE TABLE "Series" (
    "id" TEXT PRIMARY KEY,
    "underlyingAssetId" VARCHAR(64) NOT NULL,
    "quoteAssetId" VARCHAR(64) NOT NULL,
    "optionType" "OptionType" NOT NULL,
    "strikeWad" NUMERIC(78,0) NOT NULL,
    "expiry" TIMESTAMP WITH TIME ZONE NOT NULL,
    "baseFeeBps" INTEGER NOT NULL,
    "isSettled" BOOLEAN NOT NULL DEFAULT FALSE,
    "longOpenInterest" BIGINT NOT NULL DEFAULT 0,
    "shortOpenInterest" BIGINT NOT NULL DEFAULT 0,
    "totalPremiumWad" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastIvUpdateAt" TIMESTAMP WITH TIME ZONE,
    CONSTRAINT "Series_underlyingAssetId_fkey" FOREIGN KEY ("underlyingAssetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Series_quoteAssetId_fkey" FOREIGN KEY ("quoteAssetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Series_underlyingAssetId_optionType_expiry_idx" ON "Series" ("underlyingAssetId", "optionType", "expiry");
CREATE INDEX "Series_quoteAssetId_idx" ON "Series" ("quoteAssetId");

-- Series metrics
CREATE TABLE "SeriesMetric" (
    "seriesId" TEXT PRIMARY KEY,
    "markIv" NUMERIC(36,18),
    "markDelta" NUMERIC(36,18),
    "markGamma" NUMERIC(36,18),
    "markVega" NUMERIC(36,18),
    "markTheta" NUMERIC(36,18),
    "markRho" NUMERIC(36,18),
    "lastQuoteAt" TIMESTAMP WITH TIME ZONE,
    "lastTradeAt" TIMESTAMP WITH TIME ZONE,
    "oiLong" BIGINT NOT NULL DEFAULT 0,
    "oiShort" BIGINT NOT NULL DEFAULT 0,
    "openInterestUsd" NUMERIC(78,0),
    "utilizationRatio" NUMERIC(36,18),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SeriesMetric_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Quotes
CREATE TABLE "Quote" (
    "id" TEXT PRIMARY KEY,
    "seriesId" TEXT NOT NULL,
    "sizeWad" BIGINT NOT NULL,
    "premiumBidWad" BIGINT NOT NULL,
    "premiumAskWad" BIGINT NOT NULL,
    "feeBidWad" BIGINT NOT NULL,
    "feeAskWad" BIGINT NOT NULL,
    "iv" NUMERIC(36,18),
    "delta" NUMERIC(36,18),
    "gamma" NUMERIC(36,18),
    "theta" NUMERIC(36,18),
    "vega" NUMERIC(36,18),
    "rho" NUMERIC(36,18),
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quote_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Quote_seriesId_timestamp_idx" ON "Quote" ("seriesId", "timestamp");

-- Trades
CREATE TABLE "Trade" (
    "id" TEXT PRIMARY KEY,
    "seriesId" TEXT NOT NULL,
    "userAddress" VARCHAR(64) NOT NULL,
    "side" "TradeSide" NOT NULL,
    "sizeWad" BIGINT NOT NULL,
    "premiumWad" BIGINT NOT NULL,
    "feeWad" BIGINT NOT NULL,
    "txHash" VARCHAR(66) NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trade_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Trade_userAddress_idx" ON "Trade" ("userAddress");
CREATE INDEX "Trade_seriesId_timestamp_idx" ON "Trade" ("seriesId", "timestamp");
CREATE UNIQUE INDEX "Trade_txHash_key" ON "Trade" ("txHash");

-- Positions
CREATE TABLE "Position" (
    "id" TEXT PRIMARY KEY,
    "userAddress" VARCHAR(64) NOT NULL,
    "seriesId" TEXT NOT NULL,
    "positionType" "PositionType" NOT NULL,
    "sizeWad" BIGINT NOT NULL DEFAULT 0,
    "avgPriceWad" BIGINT NOT NULL DEFAULT 0,
    "pnlUnrealizedWad" BIGINT NOT NULL DEFAULT 0,
    "pnlRealizedWad" BIGINT NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Position_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Position_userAddress_seriesId_positionType_key" ON "Position" ("userAddress", "seriesId", "positionType");
CREATE INDEX "Position_seriesId_idx" ON "Position" ("seriesId");

-- Pool
CREATE TABLE "Pool" (
    "id" VARCHAR(64) PRIMARY KEY,
    "assetId" VARCHAR(64) NOT NULL,
    "tvlWad" BIGINT NOT NULL DEFAULT 0,
    "utilization" NUMERIC(36,18),
    "apy" NUMERIC(36,18),
    "totalShares" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pool_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Pool metrics
CREATE TABLE "PoolMetric" (
    "poolId" VARCHAR(64) PRIMARY KEY,
    "hedgeReserveWad" BIGINT NOT NULL DEFAULT 0,
    "protocolFeesWad" BIGINT NOT NULL DEFAULT 0,
    "lastRebalanceAt" TIMESTAMP WITH TIME ZONE,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PoolMetric_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- LP Shares
CREATE TABLE "LPShare" (
    "id" TEXT PRIMARY KEY,
    "poolId" VARCHAR(64) NOT NULL,
    "userAddress" VARCHAR(64) NOT NULL,
    "shares" BIGINT NOT NULL DEFAULT 0,
    "entryTvlWad" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LPShare_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LPShare_poolId_userAddress_key" ON "LPShare" ("poolId", "userAddress");

-- Risk Snapshots
CREATE TABLE "RiskSnapshot" (
    "id" TEXT PRIMARY KEY,
    "seriesId" TEXT,
    "userAddress" VARCHAR(64) NOT NULL,
    "netDelta" NUMERIC(36,18),
    "netGamma" NUMERIC(36,18),
    "netVega" NUMERIC(36,18),
    "marginRequiredWad" BIGINT,
    "marginAvailableWad" BIGINT,
    "liquidationPrice" NUMERIC(36,18),
    "alertLevel" "RiskAlertLevel" NOT NULL DEFAULT 'INFO',
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiskSnapshot_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "RiskSnapshot_userAddress_timestamp_idx" ON "RiskSnapshot" ("userAddress", "timestamp");

-- Margin Events
CREATE TABLE "MarginEvent" (
    "id" TEXT PRIMARY KEY,
    "userAddress" VARCHAR(64) NOT NULL,
    "seriesId" TEXT,
    "eventType" VARCHAR(32) NOT NULL,
    "deltaWad" BIGINT NOT NULL,
    "resultingMarginWad" BIGINT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarginEvent_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "MarginEvent_userAddress_timestamp_idx" ON "MarginEvent" ("userAddress", "timestamp");

-- Settlement
CREATE TABLE "Settlement" (
    "id" TEXT PRIMARY KEY,
    "seriesId" TEXT NOT NULL,
    "settlementPriceWad" BIGINT NOT NULL,
    "payoutTotalWad" BIGINT NOT NULL,
    "residualPremiumWad" BIGINT NOT NULL,
    "executedBy" VARCHAR(64) NOT NULL,
    "executedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Settlement_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Settlement_seriesId_key" ON "Settlement" ("seriesId");

-- Liquidations
CREATE TABLE "Liquidation" (
    "id" TEXT PRIMARY KEY,
    "seriesId" TEXT,
    "liquidatedUser" VARCHAR(64) NOT NULL,
    "initiator" VARCHAR(64) NOT NULL,
    "sizeClosedWad" BIGINT NOT NULL,
    "payoutWad" BIGINT NOT NULL,
    "penaltyWad" BIGINT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "txHash" VARCHAR(66) NOT NULL,
    CONSTRAINT "Liquidation_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Liquidation_liquidatedUser_timestamp_idx" ON "Liquidation" ("liquidatedUser", "timestamp");

-- Insurance flows
CREATE TABLE "InsuranceFlow" (
    "id" TEXT PRIMARY KEY,
    "source" VARCHAR(32) NOT NULL,
    "amountWad" BIGINT NOT NULL,
    "seriesId" TEXT,
    "poolId" VARCHAR(64),
    "txHash" VARCHAR(66),
    "note" TEXT,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InsuranceFlow_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InsuranceFlow_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "InsuranceFlow_timestamp_idx" ON "InsuranceFlow" ("timestamp");

-- IV Nodes
CREATE TABLE "IVNode" (
    "id" TEXT PRIMARY KEY,
    "seriesId" TEXT NOT NULL,
    "moneyness" NUMERIC(36,18) NOT NULL,
    "iv" NUMERIC(36,18) NOT NULL,
    "source" VARCHAR(32) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IVNode_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "IVNode_seriesId_createdAt_idx" ON "IVNode" ("seriesId", "createdAt");

-- Trigger to update updatedAt columns
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Asset_set_updatedAt"
BEFORE UPDATE ON "Asset"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TRIGGER "Series_set_updatedAt"
BEFORE UPDATE ON "Series"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TRIGGER "SeriesMetric_set_updatedAt"
BEFORE UPDATE ON "SeriesMetric"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TRIGGER "Pool_set_updatedAt"
BEFORE UPDATE ON "Pool"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TRIGGER "PoolMetric_set_updatedAt"
BEFORE UPDATE ON "PoolMetric"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TRIGGER "LPShare_set_updatedAt"
BEFORE UPDATE ON "LPShare"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
