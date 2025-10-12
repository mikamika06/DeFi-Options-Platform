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

type MarketContext = Awaited<ReturnType<typeof deployMarketFixture>>;

async function deployMarketFixture() {
  const [admin, trader, other, feeRecipient, keeper] = await ethers.getSigners();

  const optionToken = await new OptionToken__factory(admin).deploy("https://base/{id}.json", admin.address);
  await optionToken.waitForDeployment();

  const quoteToken = await new MockERC20__factory(admin).deploy(
    "MockUSDC",
    "mUSDC",
    6,
    ethers.parseUnits("500000", 6),
    admin.address
  );
  await quoteToken.waitForDeployment();

  const underlyingToken = await new MockERC20__factory(admin).deploy(
    "MockETH",
    "mETH",
    18,
    ethers.parseUnits("100000", 18),
    admin.address
  );
  await underlyingToken.waitForDeployment();

  await quoteToken.connect(admin).transfer(trader.address, ethers.parseUnits("10000", 6));
  await quoteToken.connect(admin).transfer(other.address, ethers.parseUnits("10000", 6));

  const oracle = await new FlexibleOracleRouter__factory(admin).deploy(ethers.parseUnits("2000", 6), 6);
  await oracle.waitForDeployment();
  await oracle.setAssetPrice(await underlyingToken.getAddress(), ethers.parseUnits("2000", 6), 6);
  await oracle.setAssetPrice(await quoteToken.getAddress(), ethers.parseUnits("1", 6), 6);

  const ivOracle = await new MockIVOracle__factory(admin).deploy();
  await ivOracle.waitForDeployment();

  const collateralManager = await new MockCollateralManager__factory(admin).deploy();
  await collateralManager.waitForDeployment();

  const liquidityVault = await new MockLiquidityVault__factory(admin).deploy();
  await liquidityVault.waitForDeployment();

  const insuranceFund = await new MockInsuranceFund__factory(admin).deploy();
  await insuranceFund.waitForDeployment();

  const market = await new OptionsMarketHarness__factory(admin).deploy(
    await optionToken.getAddress(),
    await oracle.getAddress(),
    await ivOracle.getAddress(),
    await collateralManager.getAddress(),
    feeRecipient.address,
    admin.address
  );
  await market.waitForDeployment();

  await optionToken.connect(admin).grantRoles(await market.getAddress());
  await market.connect(admin).setLiquidityVault(await liquidityVault.getAddress());
  await market.connect(admin).setInsuranceFund(await insuranceFund.getAddress());

  const currentTimestamp = await time.latest();
  const seriesConfig = {
    underlying: await underlyingToken.getAddress(),
    quote: await quoteToken.getAddress(),
    strike: ethers.parseUnits("1800", 18),
    expiry: BigInt(currentTimestamp + 7 * 24 * 60 * 60),
    isCall: true,
    baseFeeBps: 50
  };
  const seriesId = await market.computeSeriesId(seriesConfig);
  await ivOracle.setIV(seriesId, ethers.parseUnits("0.4", 18));

  return {
    admin,
    trader,
    other,
    keeper,
    feeRecipient,
    optionToken,
    quoteToken,
    underlyingToken,
    oracle,
    ivOracle,
    collateralManager,
    liquidityVault,
    insuranceFund,
    market,
    seriesConfig,
    seriesId
  };
}

describe("OptionsMarketV2 administrative functions", function () {
  it("constructor requires non-zero addresses", async function () {
    const ctx = await deployMarketFixture();
    const factory = new OptionsMarketHarness__factory(ctx.admin);
    await expect(
      factory.deploy(
        await ctx.optionToken.getAddress(),
        ethers.ZeroAddress,
        await ctx.ivOracle.getAddress(),
        await ctx.collateralManager.getAddress(),
        ctx.feeRecipient.address,
        ctx.admin.address
      )
    ).to.be.revertedWithCustomError(factory, "OptionsMarket_InvalidAddress");
  });

  it("updates fee recipient, oracle, iv oracle, and collateral manager with guards", async function () {
    const { market, admin, oracle, ivOracle, collateralManager } = await loadFixture(deployMarketFixture);
    await expect(market.connect(admin).setFeeRecipient(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      market,
      "OptionsMarket_InvalidAddress"
    );
    await market.connect(admin).setFeeRecipient(await oracle.getAddress());
    expect(await market.feeRecipient()).to.equal(await oracle.getAddress());

    const newOracle = await new FlexibleOracleRouter__factory(admin).deploy(ethers.parseUnits("1500", 6), 6);
    await newOracle.waitForDeployment();
    await expect(market.connect(admin).setOracleRouter(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      market,
      "OptionsMarket_InvalidAddress"
    );
    await market.connect(admin).setOracleRouter(await newOracle.getAddress());
    expect(await market.oracleRouter()).to.equal(await newOracle.getAddress());

    const newIv = await new MockIVOracle__factory(admin).deploy();
    await newIv.waitForDeployment();
    await expect(market.connect(admin).setIvOracle(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      market,
      "OptionsMarket_InvalidAddress"
    );
    await market.connect(admin).setIvOracle(await newIv.getAddress());
    expect(await market.ivOracle()).to.equal(await newIv.getAddress());

    const newCollateral = await new MockCollateralManager__factory(admin).deploy();
    await newCollateral.waitForDeployment();
    await expect(market.connect(admin).setCollateralManager(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      market,
      "OptionsMarket_InvalidAddress"
    );
    await expect(market.connect(admin).setCollateralManager(await newCollateral.getAddress()))
      .to.emit(market, "CollateralManagerUpdated")
      .withArgs(await newCollateral.getAddress());
  });

  it("enforces pause and unpause for trades", async function () {
    const context = await loadFixture(deployMarketFixture);
    const { market, admin, trader, quoteToken, seriesConfig, seriesId } = context;
    await market.connect(admin).createSeries(seriesConfig);
    const [premium, fee] = await market.quote(seriesId, ethers.parseUnits("1", 18));
    await quoteToken.connect(trader).approve(await market.getAddress(), premium + fee);

    await market.connect(admin).pause();
    await expect(
      market.connect(trader).trade(seriesId, ethers.parseUnits("1", 18), premium + fee)
    ).to.be.revertedWithCustomError(market, "EnforcedPause");
    await market.connect(admin).unpause();
  });
});

describe("OptionsMarketV2 series management", function () {
  it("validates series creation inputs and duplicate prevention", async function () {
    const ctx = await loadFixture(deployMarketFixture);
    const { market, admin, seriesConfig, seriesId } = ctx;
    const now = await time.latest();

    await expect(
      market.connect(admin).createSeries({ ...seriesConfig, expiry: BigInt(now - 10) })
    ).to.be.revertedWithCustomError(market, "OptionsMarket_InvalidExpiry");

    await expect(
      market.connect(admin).createSeries({ ...seriesConfig, underlying: ethers.ZeroAddress })
    ).to.be.revertedWithCustomError(market, "OptionsMarket_InvalidAddress");

    await market.connect(admin).createSeries(seriesConfig);
    await expect(market.connect(admin).createSeries(seriesConfig)).to.be.revertedWithCustomError(
      market,
      "OptionsMarket_SeriesExists"
    );
  });

  it("covers quote error scenarios", async function () {
    const ctx = await loadFixture(deployMarketFixture);
    const { market, admin, oracle, ivOracle, seriesConfig, seriesId } = ctx;
    await market.connect(admin).createSeries(seriesConfig);

    await expect(market.quote(seriesId, 0n)).to.be.revertedWithCustomError(market, "OptionsMarket_InvalidSize");
    await expect(market.quote(ethers.ZeroHash, 1n)).to.be.revertedWithCustomError(market, "OptionsMarket_SeriesNotFound");

    await ivOracle.setIV(seriesId, 0);
    await expect(market.quote(seriesId, ethers.parseUnits("1", 18))).to.be.revertedWithCustomError(
      market,
      "OptionsMarket_InvalidVolatility"
    );
    await ivOracle.setIV(seriesId, ethers.parseUnits("0.4", 18));

    await oracle.setAssetPrice(seriesConfig.underlying, 0, 6);
    await expect(market.quote(seriesId, ethers.parseUnits("1", 18))).to.be.revertedWithCustomError(
      market,
      "OptionsMarket_InvalidSpot"
    );
    await oracle.setAssetPrice(seriesConfig.underlying, ethers.parseUnits("2000", 6), 6);

    await time.increaseTo(Number(seriesConfig.expiry) + 1);
    await market.connect(admin)["settleSeries(bytes32,address)"](seriesId, ethers.ZeroAddress);
    await expect(market.quote(seriesId, ethers.parseUnits("1", 18))).to.be.revertedWithCustomError(
      market,
      "OptionsMarket_SeriesSettled"
    );
  });
});

describe("OptionsMarketV2 trading and risk flows", function () {
  async function prepareSeries(context: MarketContext) {
    const { market, admin, seriesConfig } = context;
    await market.connect(admin).createSeries(seriesConfig);
  }

  it("validates trade edge cases and slippage", async function () {
    const ctx = await loadFixture(deployMarketFixture);
    await prepareSeries(ctx);
    const { market, trader, seriesId, quoteToken } = ctx;

    await expect(
      market.connect(trader).trade(seriesId, 0n, 0)
    ).to.be.revertedWithCustomError(market, "OptionsMarket_InvalidSize");

    const size = ethers.parseUnits("1", 18);
    const [premium, fee] = await market.quote(seriesId, size);
    await quoteToken.connect(trader).approve(await market.getAddress(), premium + fee);
    await expect(market.connect(trader).trade(seriesId, size, premium - 1n)).to.be.revertedWithCustomError(
      market,
      "OptionsMarket_SlippageExceeded"
    );

    const hugeSize = (BigInt(2) ** BigInt(129));
    await expect(market.connect(trader).trade(seriesId, hugeSize, 0)).to.be.revertedWithCustomError(
      market,
      "OptionsMarket_SizeTooLarge"
    );
  });

  it("handles closing and exercising with boundary conditions", async function () {
    const ctx = await loadFixture(deployMarketFixture);
    await prepareSeries(ctx);
    const { market, trader, admin, seriesId, seriesConfig, quoteToken, oracle, insuranceFund } = ctx;

    const size = ethers.parseUnits("2", 18);
    const [premium, fee] = await market.quote(seriesId, size);
    await quoteToken.connect(trader).approve(await market.getAddress(), premium + fee);
    await market.connect(trader).trade(seriesId, size, premium + fee);

    await expect(market.connect(trader).closePosition(seriesId, 0n, 0)).to.be.revertedWithCustomError(
      market,
      "OptionsMarket_InvalidSize"
    );

    await expect(
      market.connect(trader).closePosition(seriesId, size + 1n, 0)
    ).to.be.revertedWithCustomError(market, "OptionsMarket_InvalidSize");

    await market.connect(trader).closePosition(seriesId, size / 2n, 0);

    await expect(market.connect(trader).exercise(seriesId, size / 2n, 0)).to.be.revertedWithCustomError(
      market,
      "OptionsMarket_InvalidExpiry"
    );

    await time.increaseTo(Number(seriesConfig.expiry) + 1);
    await oracle.setAssetPrice(seriesConfig.underlying, ethers.parseUnits("2500", 6), 6);
    await insuranceFund.setCoverageBudget(ethers.parseUnits("10000", 6));
    await market.connect(trader).exercise(seriesId, size / 2n, 0);
  });

  it("enforces short position invariants", async function () {
    const ctx = await loadFixture(deployMarketFixture);
    await prepareSeries(ctx);
    const { market, trader, seriesId, optionToken } = ctx;

    await expect(market.connect(trader).openShort(seriesId, 0n, trader.address)).to.be.revertedWithCustomError(
      market,
      "OptionsMarket_InvalidSize"
    );
    await expect(market.connect(trader).openShort(seriesId, 1n, ethers.ZeroAddress)).to.be.revertedWithCustomError(
      market,
      "OptionsMarket_InvalidAddress"
    );

    await market.connect(trader).openShort(seriesId, 10n, trader.address);
    await expect(market.connect(trader).closeShort(seriesId, 11n)).to.be.revertedWithCustomError(
      market,
      "OptionsMarket_InvalidSize"
    );

    await optionToken.connect(trader).setApprovalForAll(await market.getAddress(), true);
    await market.connect(trader).closeShort(seriesId, 10n);
  });

  it("liquidates positions through keeper role", async function () {
    const ctx = await loadFixture(deployMarketFixture);
    await prepareSeries(ctx);
    const { market, admin, trader, seriesId } = ctx;
    await expect(
      market.connect(admin).liquidatePosition(seriesId, ethers.ZeroAddress, 1n, trader.address)
    ).to.be.revertedWithCustomError(market, "OptionsMarket_InvalidAddress");
  });

  it("settles series with validation", async function () {
    const ctx = await loadFixture(deployMarketFixture);
    await prepareSeries(ctx);
    const { market, admin, seriesId, seriesConfig, quoteToken, trader } = ctx;
    const size = ethers.parseUnits("1", 18);
    const [premium, fee] = await market.quote(seriesId, size);
    await quoteToken.connect(trader).approve(await market.getAddress(), premium + fee);
    await market.connect(trader).trade(seriesId, size, premium + fee);

    await expect(market.connect(admin)["settleSeries(bytes32,address)"](seriesId, admin.address)).to.be.revertedWithCustomError(
      market,
      "OptionsMarket_InvalidExpiry"
    );

    await time.increaseTo(Number(seriesConfig.expiry) + 1);
    await expect(market.connect(admin)["settleSeries(bytes32,address)"](seriesId, admin.address)).to.be.revertedWithCustomError(
      market,
      "OptionsMarket_InvalidSize"
    );
  });
});
