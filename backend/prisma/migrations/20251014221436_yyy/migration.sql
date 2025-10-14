/*
  Warnings:

  - The primary key for the `PoolMetric` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "IVNode" DROP CONSTRAINT "IVNode_seriesId_fkey";

-- DropForeignKey
ALTER TABLE "InsuranceFlow" DROP CONSTRAINT "InsuranceFlow_poolId_fkey";

-- DropForeignKey
ALTER TABLE "LPShare" DROP CONSTRAINT "LPShare_poolId_fkey";

-- DropForeignKey
ALTER TABLE "Pool" DROP CONSTRAINT "Pool_assetId_fkey";

-- DropForeignKey
ALTER TABLE "PoolMetric" DROP CONSTRAINT "PoolMetric_poolId_fkey";

-- DropForeignKey
ALTER TABLE "Position" DROP CONSTRAINT "Position_seriesId_fkey";

-- DropForeignKey
ALTER TABLE "Quote" DROP CONSTRAINT "Quote_seriesId_fkey";

-- DropForeignKey
ALTER TABLE "Series" DROP CONSTRAINT "Series_quoteAssetId_fkey";

-- DropForeignKey
ALTER TABLE "Series" DROP CONSTRAINT "Series_underlyingAssetId_fkey";

-- DropForeignKey
ALTER TABLE "SeriesMetric" DROP CONSTRAINT "SeriesMetric_seriesId_fkey";

-- DropForeignKey
ALTER TABLE "Settlement" DROP CONSTRAINT "Settlement_seriesId_fkey";

-- DropForeignKey
ALTER TABLE "Trade" DROP CONSTRAINT "Trade_seriesId_fkey";

-- DropIndex
DROP INDEX "Trade_txHash_key";

-- AlterTable
ALTER TABLE "Asset" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "IVNode" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "InsuranceFlow" ALTER COLUMN "poolId" SET DATA TYPE TEXT,
ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LPShare" ALTER COLUMN "poolId" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Liquidation" ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MarginEvent" ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Pool" ALTER COLUMN "assetId" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PoolMetric" DROP CONSTRAINT "PoolMetric_pkey",
ALTER COLUMN "poolId" SET DATA TYPE TEXT,
ALTER COLUMN "lastRebalanceAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "PoolMetric_pkey" PRIMARY KEY ("poolId");

-- AlterTable
ALTER TABLE "Position" ALTER COLUMN "lastUpdated" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Quote" ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RiskSnapshot" ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Series" ALTER COLUMN "underlyingAssetId" SET DATA TYPE TEXT,
ALTER COLUMN "quoteAssetId" SET DATA TYPE TEXT,
ALTER COLUMN "expiry" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "lastIvUpdateAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SeriesMetric" ALTER COLUMN "lastQuoteAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "lastTradeAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Settlement" ALTER COLUMN "executedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Trade" ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "IndexerState" (
    "id" TEXT NOT NULL,
    "lastBlock" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexerState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trades_tx_hash_idx" ON "Trade"("txHash");

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_underlyingAssetId_fkey" FOREIGN KEY ("underlyingAssetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_quoteAssetId_fkey" FOREIGN KEY ("quoteAssetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesMetric" ADD CONSTRAINT "SeriesMetric_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolMetric" ADD CONSTRAINT "PoolMetric_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LPShare" ADD CONSTRAINT "LPShare_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceFlow" ADD CONSTRAINT "InsuranceFlow_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IVNode" ADD CONSTRAINT "IVNode_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
