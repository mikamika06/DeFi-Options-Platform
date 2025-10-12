import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { OptionToken__factory } from "../types/factories/src/OptionToken__factory";
import { OptionsMarketHarness__factory } from "../types/factories/src/mocks/OptionsMarketHarness__factory";
import { MockERC20__factory } from "../types/factories/src/mocks/MockERC20__factory";
import { FlexibleOracleRouter__factory } from "../types/factories/src/mocks/FlexibleOracleRouter__factory";
import { MockIVOracle__factory } from "../types/factories/src/mocks/MockIVOracle__factory";
import { MockCollateralManager__factory } from "../types/factories/src/mocks/MockCollateralManager__factory";
import { MockLiquidityVault__factory } from "../types/factories/src/mocks/MockLiquidityVault__factory";
import { MockInsuranceFund__factory } from "../types/factories/src/mocks/MockInsuranceFund__factory";
import { CollateralManager__factory } from "../types/factories/src/CollateralManager__factory";
import { LiquidityVault__factory } from "../types/factories/src/LiquidityVault__factory";
import { InsuranceFund__factory } from "../types/factories/src/InsuranceFund__factory";

type MarketFixture = Awaited<ReturnType<typeof deployMarketFixture>>;

async function deployMarketFixture() {
  const [admin, longTrader, shortWriter, feeRecipient, treasury, keeper] = await ethers.getSigners();

  const optionToken = await new OptionToken__factory(admin).deploy("https://example.com/{id}.json", admin.address);
  await optionToken.waitForDeployment();
  const optionTokenAddress = await optionToken.getAddress();

  const quoteToken = await new MockERC20__factory(admin).deploy(
    "MockUSDC",
    "mUSDC",
    6,
    ethers.parseUnits("500000", 6),
    admin.address
  );
  await quoteToken.waitForDeployment();
  const quoteAddress = await quoteToken.getAddress();

  const underlyingToken = await new MockERC20__factory(admin).deploy(
    "MockETH",
    "mETH",
    18,
    ethers.parseUnits("100000", 18),
    admin.address
  );
  await underlyingToken.waitForDeployment();
  const underlyingAddress = await underlyingToken.getAddress();

  await quoteToken.connect(admin).transfer(longTrader.address, ethers.parseUnits("100000", 6));
  await quoteToken.connect(admin).transfer(shortWriter.address, ethers.parseUnits("100000", 6));
  await quoteToken.connect(admin).transfer(treasury.address, ethers.parseUnits("50000", 6));

  const oracle = await new FlexibleOracleRouter__factory(admin).deploy(ethers.parseUnits("2000", 6), 6);
  await oracle.waitForDeployment();
  await oracle.setAssetPrice(underlyingAddress, ethers.parseUnits("2000", 6), 6);
  await oracle.setAssetPrice(quoteAddress, ethers.parseUnits("1", 6), 6);
  const oracleAddress = await oracle.getAddress();

  const ivOracle = await new MockIVOracle__factory(admin).deploy();
  await ivOracle.waitForDeployment();
  const ivOracleAddress = await ivOracle.getAddress();

  const collateralManager = await new MockCollateralManager__factory(admin).deploy();
  await collateralManager.waitForDeployment();
  const collateralManagerAddress = await collateralManager.getAddress();

  const liquidityVault = await new MockLiquidityVault__factory(admin).deploy();
  await liquidityVault.waitForDeployment();
  const liquidityVaultAddress = await liquidityVault.getAddress();

  const insuranceFund = await new MockInsuranceFund__factory(admin).deploy();
  await insuranceFund.waitForDeployment();
  const insuranceFundAddress = await insuranceFund.getAddress();

  const market = await new OptionsMarketHarness__factory(admin).deploy(
    optionTokenAddress,
    oracleAddress,
    ivOracleAddress,
    collateralManagerAddress,
    feeRecipient.address,
    admin.address
  );
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();

  await optionToken.connect(admin).grantRoles(marketAddress);
  await market.connect(admin).setLiquidityVault(liquidityVaultAddress);
  await market.connect(admin).setInsuranceFund(insuranceFundAddress);
  await market.connect(admin).setInsuranceFeeBps(800); // 8%
  await market.connect(admin).setSettlementShares(3000, 2000); // 30% vault, 20% insurance

  const currentTimestamp = await getLatestTimestamp();
  const baseSeriesConfig = {
    underlying: underlyingAddress,
    quote: quoteAddress,
    strike: ethers.parseUnits("1800", 18),
    expiry: BigInt(currentTimestamp + 14 * 24 * 60 * 60),
    isCall: true,
    baseFeeBps: 75
  };
  const baseSeriesId = await market.computeSeriesId(baseSeriesConfig);
  await ivOracle.setIV(baseSeriesId, ethers.parseUnits("0.45", 18));

  return {
    admin,
    longTrader,
    shortWriter,
    feeRecipient,
    treasury,
    keeper,
    market,
    optionToken,
    quoteToken,
    underlyingToken,
    oracle,
    ivOracle,
    collateralManager,
    liquidityVault,
    insuranceFund,
    baseSeriesConfig,
    baseSeriesId,
    marketAddress,
    liquidityVaultAddress,
    insuranceFundAddress
  };
}

async function getLatestTimestamp(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return Number(block?.timestamp ?? Math.floor(Date.now() / 1000));
}

describe("Protocol heavy scenarios", function () {
  describe("Options market lifecycle", function () {
    it("handles end-to-end long option lifecycle with coverage and settlement", async function () {
      const context = await loadFixture(deployMarketFixture);
      const {
        admin,
        longTrader,
        feeRecipient,
        treasury,
        market,
        optionToken,
        quoteToken,
        oracle,
        ivOracle,
        liquidityVault,
        insuranceFund,
        baseSeriesConfig,
        baseSeriesId,
        marketAddress,
        insuranceFundAddress
      } = context;

      await market.connect(admin).createSeries(baseSeriesConfig);

      const tradeSize = ethers.parseUnits("5", 18);
      const [premium, fee] = await market.quote(baseSeriesId, tradeSize);

      await quoteToken.connect(longTrader).approve(marketAddress, ethers.MaxUint256);
      const longBalanceBefore = await quoteToken.balanceOf(longTrader.address);

      await market.connect(longTrader).trade(baseSeriesId, tradeSize, premium + fee + ethers.parseUnits("1", 6));

      const longBalanceAfter = await quoteToken.balanceOf(longTrader.address);
      expect(longBalanceBefore - longBalanceAfter).to.equal(premium + fee);
      expect(await optionToken.balanceOf(longTrader.address, BigInt(baseSeriesId))).to.equal(tradeSize);
      expect(await liquidityVault.totalPremiumRecorded()).to.equal(premium - (premium * 800n) / 10_000n);
      expect(await insuranceFund.totalPremiumNotified()).to.equal((premium * 800n) / 10_000n);

      const partialClose = tradeSize / 2n;
      await oracle.setAssetPrice(baseSeriesConfig.underlying, ethers.parseUnits("2100", 6), 6);
      await market.connect(longTrader).closePosition(baseSeriesId, partialClose, 0);
      expect(await optionToken.balanceOf(longTrader.address, BigInt(baseSeriesId))).to.equal(tradeSize - partialClose);
      expect(await liquidityVault.totalLossRecorded()).to.be.gt(0n);

      // force reserve to a small buffer to guarantee coverage usage on exercise
      await market.connect(admin).forceSetSeriesReserve(baseSeriesId, 0);

      await time.increase(15 * 24 * 60 * 60);
      await oracle.setAssetPrice(baseSeriesConfig.underlying, ethers.parseUnits("2500", 6), 6);

      const coverageBudget = ethers.parseUnits("50000", 6);
      await insuranceFund.setCoverageBudget(coverageBudget);
      await quoteToken.connect(treasury).transfer(insuranceFundAddress, coverageBudget);

      const [spotPrice] = await oracle.spot(baseSeriesConfig.underlying);
      expect(spotPrice).to.equal(ethers.parseUnits("2500", 6));

      const seriesState = await market.getSeries(baseSeriesId);
      const strikeWad = BigInt(seriesState.config.strike);
      const strikeDecimals = strikeWad / 10n ** 12n;
      expect(strikeDecimals).to.equal(ethers.parseUnits("1800", 6));
      const intrinsic = spotPrice > strikeDecimals ? spotPrice - strikeDecimals : 0n;
      expect(intrinsic).to.be.gt(0n);
      const remainingSize = tradeSize - partialClose;
      expect(remainingSize).to.be.gt(0n);
      const expectedPayout = (intrinsic * remainingSize) / 10n ** 18n;
      const expectedPayoutValue = 1750000000n;
      expect(expectedPayout).to.equal(expectedPayoutValue);

      await market.connect(longTrader).exercise(baseSeriesId, tradeSize - partialClose, 0);
      expect(await optionToken.balanceOf(longTrader.address, BigInt(baseSeriesId))).to.equal(0n);
      const coverageRequested = await insuranceFund.lastCoverageRequested();
      const coverageProvided = await insuranceFund.lastCoverageProvided();
      expect(coverageRequested, "coverage request expected").to.equal(expectedPayout);
      expect(coverageProvided).to.equal(coverageRequested);
      expect(await insuranceFund.totalCoverageProvided()).to.equal(coverageProvided);

      const residualSeed = ethers.parseUnits("1000", 6);
      await market.connect(admin).forceSetSeriesReserve(baseSeriesId, residualSeed);
      const residualBefore = await market.getSeriesReserve(baseSeriesId);
      expect(residualBefore).to.equal(residualSeed);

      const payoutBefore = await quoteToken.balanceOf(feeRecipient.address);
      await market.connect(admin)["settleSeries(bytes32,address)"](baseSeriesId, longTrader.address);
      const payoutAfter = await quoteToken.balanceOf(feeRecipient.address);

      expect(payoutAfter).to.be.gte(payoutBefore);
      const expectedVaultSettlement = (residualSeed * 3000n) / 10_000n;
      expect(await liquidityVault.totalSettlementHandled()).to.equal(expectedVaultSettlement);
      expect(await insuranceFund.totalPremiumNotified()).to.be.gt(0n);
      expect(await quoteToken.balanceOf(longTrader.address)).to.be.gt(longBalanceAfter);
    });

    it("manages short writer margin and unwind flows", async function () {
      const context = await loadFixture(deployMarketFixture);
      const {
        admin,
        shortWriter,
        market,
        optionToken,
        oracle,
        collateralManager,
        quoteToken,
        baseSeriesConfig,
        baseSeriesId,
        marketAddress
      } = context;

      await market.connect(admin).createSeries(baseSeriesConfig);
      await oracle.setAssetPrice(baseSeriesConfig.underlying, ethers.parseUnits("1900", 6), 6);

      const shortSize = ethers.parseUnits("4", 18);
      await optionToken.connect(shortWriter).setApprovalForAll(marketAddress, true);

      await market.connect(shortWriter).openShort(baseSeriesId, shortSize, shortWriter.address);
      expect(await optionToken.balanceOf(shortWriter.address, BigInt(baseSeriesId))).to.equal(shortSize);
      expect(await collateralManager.lockedMargin(shortWriter.address)).to.be.gt(0n);

      const marginBefore = await collateralManager.lockedMargin(shortWriter.address);
      const unwindSize = shortSize / 2n;
      await market.connect(shortWriter).closeShort(baseSeriesId, unwindSize);
      expect(await optionToken.balanceOf(shortWriter.address, BigInt(baseSeriesId))).to.equal(shortSize - unwindSize);
      expect(await collateralManager.lockedMargin(shortWriter.address)).to.be.lt(marginBefore);

      await market.connect(shortWriter).closeShort(baseSeriesId, shortSize - unwindSize);
      expect(await optionToken.balanceOf(shortWriter.address, BigInt(baseSeriesId))).to.equal(0n);
      expect(await collateralManager.lockedMargin(shortWriter.address)).to.equal(0n);
      expect(await collateralManager.exposureWad(shortWriter.address)).to.equal(0n);
    });
  });

  describe("CollateralManager heavy behaviour", function () {
    async function deployCollateralFixture() {
      const [admin, user, liquidator] = await ethers.getSigners();
      const manager = await new CollateralManager__factory(admin).deploy(admin.address);
      await manager.waitForDeployment();

      const usdc = await new MockERC20__factory(admin).deploy("MockUSDC", "mUSDC", 6, 0, admin.address);
      await usdc.waitForDeployment();
      const weth = await new MockERC20__factory(admin).deploy("MockWETH", "mWETH", 18, 0, admin.address);
      await weth.waitForDeployment();

      await manager
        .connect(admin)
        .setAssetConfig(await usdc.getAddress(), {
          isEnabled: true,
          collateralFactorBps: 9000,
          liquidationThresholdBps: 9500,
          decimals: 6
        });
      await manager
        .connect(admin)
        .setAssetConfig(await weth.getAddress(), {
          isEnabled: true,
          collateralFactorBps: 8000,
          liquidationThresholdBps: 9000,
          decimals: 18
        });

      await manager.connect(admin).setAssetPrice(await usdc.getAddress(), ethers.parseUnits("1", 18));
      await manager.connect(admin).setAssetPrice(await weth.getAddress(), ethers.parseUnits("2000", 18));

      await usdc.mint(user.address, ethers.parseUnits("10000", 6));
      await weth.mint(user.address, ethers.parseUnits("5", 18));

      await usdc.connect(user).approve(await manager.getAddress(), ethers.MaxUint256);
      await weth.connect(user).approve(await manager.getAddress(), ethers.MaxUint256);

      return { admin, user, liquidator, manager, usdc, weth };
    }

    it("tracks multi-asset exposure, locking, and evaluation", async function () {
      const { admin, user, manager, usdc, weth } = await loadFixture(deployCollateralFixture);

      const depositStable = ethers.parseUnits("5000", 6);
      const depositWeth = ethers.parseUnits("2", 18);

      await manager.connect(user).deposit(user.address, await usdc.getAddress(), depositStable);
      await manager.connect(user).deposit(user.address, await weth.getAddress(), depositWeth);

      expect(await manager.balanceOf(user.address, await usdc.getAddress())).to.equal(depositStable);
      expect(await manager.balanceOf(user.address, await weth.getAddress())).to.equal(depositWeth);

      const [equityBefore] = await manager.getAccountMargin(user.address);
      expect(equityBefore).to.be.gt(0n);

      const marginLock = ethers.parseUnits("1000", 18);
      await manager.connect(admin).lockMargin(user.address, marginLock, marginLock / 2n);
      expect(await manager.lockedMarginRequirement(user.address)).to.equal(marginLock);
      expect(await manager.maintenanceMarginRequirement(user.address)).to.equal(marginLock / 2n);

      await manager.connect(admin).updateMarginRequirements(user.address, marginLock * 2n);
      expect(await manager.accountExposureWad(user.address)).to.be.gte(marginLock * 2n);
      const maintenanceAfterUpdate = await manager.maintenanceMarginRequirement(user.address);

      await manager.connect(admin).releaseMargin(user.address, marginLock / 2n, marginLock / 4n);
      expect(await manager.lockedMarginRequirement(user.address)).to.equal(marginLock / 2n);
      const maintenanceAfterRelease = await manager.maintenanceMarginRequirement(user.address);
      const expectedMaintenance = maintenanceAfterUpdate > marginLock / 4n
        ? maintenanceAfterUpdate - marginLock / 4n
        : 0n;
      expect(maintenanceAfterRelease).to.equal(expectedMaintenance);

      await manager.connect(admin).evaluateAccount(user.address);
      const status = await manager.getAccountStatus(user.address);
      expect(status.inLiquidation).to.equal(false);

      await manager.connect(user).withdraw(user.address, await usdc.getAddress(), depositStable / 2n);
      expect(await manager.balanceOf(user.address, await usdc.getAddress())).to.equal(depositStable / 2n);
    });
  });

  describe("LiquidityVault heavy behaviour", function () {
    async function deployVaultFixture() {
      const [admin, lp1, lp2, feeCollector] = await ethers.getSigners();
      const asset = await new MockERC20__factory(admin).deploy("MockUSDC", "mUSDC", 6, ethers.parseUnits("200000", 6), admin.address);
      await asset.waitForDeployment();

      const vault = await new LiquidityVault__factory(admin).deploy(
        await asset.getAddress(),
        "Vault Share",
        "vSHARE",
        admin.address,
        { performanceFeeBps: 500, managementFeeBps: 200, withdrawalCooldown: 12 }
      );
      await vault.waitForDeployment();

      await asset.connect(admin).transfer(lp1.address, ethers.parseUnits("50000", 6));
      await asset.connect(admin).transfer(lp2.address, ethers.parseUnits("40000", 6));

      await asset.connect(lp1).approve(await vault.getAddress(), ethers.MaxUint256);
      await asset.connect(lp2).approve(await vault.getAddress(), ethers.MaxUint256);

      return { admin, lp1, lp2, feeCollector, asset, vault };
    }

    it("manages multi-lp flows, cooldowns, and fee accounting", async function () {
      const { admin, lp1, lp2, asset, vault } = await loadFixture(deployVaultFixture);

      const lp1Deposit = ethers.parseUnits("10000", 6);
      const lp2Deposit = ethers.parseUnits("8000", 6);

      await vault.connect(lp1).deposit(lp1Deposit, lp1.address);
      await vault.connect(lp2).deposit(lp2Deposit, lp2.address);

      expect(await vault.balanceOf(lp1.address)).to.be.gt(0n);
      expect(await vault.balanceOf(lp2.address)).to.be.gt(0n);

      await vault.connect(admin).setPremiumHandler(admin.address, true);
      await asset.connect(admin).approve(await vault.getAddress(), ethers.MaxUint256);
      await vault.connect(admin).recordPremium(await asset.getAddress(), ethers.parseUnits("2000", 6));

      await time.increase(13);
      await vault.connect(lp1).withdraw(lp1Deposit / 2n, lp1.address, lp1.address);
      expect(await vault.balanceOf(lp1.address)).to.be.lt(await vault.balanceOf(lp2.address));
    });
  });

  describe("InsuranceFund heavy behaviour", function () {
    async function deployFundFixture() {
      const [admin, strategy, marketRole, treasury] = await ethers.getSigners();
      const fund = await new InsuranceFund__factory(admin).deploy(admin.address);
      await fund.waitForDeployment();

      const asset = await new MockERC20__factory(admin).deploy("MockUSDC", "mUSDC", 6, ethers.parseUnits("100000", 6), treasury.address);
      await asset.waitForDeployment();

      await fund.connect(admin).setAssetApproval(await asset.getAddress(), true);
      await fund.connect(admin).setMarket(marketRole.address, true);
      const treasurerRole = await fund.TREASURER_ROLE();
      await fund.connect(admin).grantRole(treasurerRole, treasury.address);
      await asset.connect(treasury).approve(await fund.getAddress(), ethers.MaxUint256);

      return { admin, strategy, marketRole, treasury, fund, asset };
    }

    it("processes deposits, coverage, and treasury withdrawals", async function () {
      const { admin, marketRole, treasury, fund, asset } = await loadFixture(deployFundFixture);

      const depositAmount = ethers.parseUnits("20000", 6);
      await fund.connect(treasury).deposit(await asset.getAddress(), depositAmount);
      expect((await fund.assetBalances(await asset.getAddress())).totalDeposited).to.equal(depositAmount);

      await fund.connect(marketRole).notifyPremium(await asset.getAddress(), ethers.parseUnits("1000", 6));
      expect((await fund.assetBalances(await asset.getAddress())).totalDeposited).to.equal(depositAmount + ethers.parseUnits("1000", 6));
      const requestedCoverage = ethers.parseUnits("5000", 6);
      const staticCoverage = await fund
        .connect(marketRole)
        .requestCoverage.staticCall(await asset.getAddress(), requestedCoverage, treasury.address);
      expect(staticCoverage).to.equal(requestedCoverage);
      await fund.connect(marketRole).requestCoverage(await asset.getAddress(), requestedCoverage, treasury.address);

      await fund.connect(admin).withdraw(await asset.getAddress(), ethers.parseUnits("3000", 6), treasury.address);
      const balances = await fund.assetBalances(await asset.getAddress());
      expect(balances.totalWithdrawn).to.be.gte(ethers.parseUnits("8000", 6));
    });
  });
});
