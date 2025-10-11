import { expect } from "chai";
import { ethers } from "hardhat";

describe("OptionsMarketV2", function () {
  async function deployFixture() {
    const [admin, trader, feeRecipient] = await ethers.getSigners();

    const OptionToken = await ethers.getContractFactory("OptionToken");
    const optionToken = await OptionToken.deploy("https://example.com/{id}.json", admin.address);
    await optionToken.waitForDeployment();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const quoteToken = await ERC20Mock.deploy("MockUSDC", "mUSDC", admin.address, ethers.parseUnits("1000000", 6));
    await quoteToken.waitForDeployment();
    await quoteToken.mint(trader.address, ethers.parseUnits("10000", 6));

    const MockOracleRouter = await ethers.getContractFactory("MockOracleRouter");
    const oracleRouter = await MockOracleRouter.deploy(ethers.parseUnits("2000", 6), 6);
    await oracleRouter.waitForDeployment();

    const MockIVOracle = await ethers.getContractFactory("MockIVOracle");
    const ivOracle = await MockIVOracle.deploy();
    await ivOracle.waitForDeployment();

    const MockCollateralManager = await ethers.getContractFactory("MockCollateralManager");
    const collateralManager = await MockCollateralManager.deploy();
    await collateralManager.waitForDeployment();

    const OptionsMarketHarness = await ethers.getContractFactory("OptionsMarketHarness");
    const market = await OptionsMarketHarness.deploy(
      optionToken.getAddress(),
      oracleRouter.getAddress(),
      ivOracle.getAddress(),
      collateralManager.getAddress(),
      feeRecipient.address,
      admin.address
    );
    await market.waitForDeployment();

    await optionToken.connect(admin).grantRoles(await market.getAddress());

    const seriesConfig = {
      underlying: ethers.ZeroAddress,
      quote: await quoteToken.getAddress(),
      strike: ethers.parseUnits("1800", 18),
      expiry: BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60),
      isCall: true,
      baseFeeBps: 50
    };

    const tx = await market.connect(admin).createSeries(seriesConfig);
    const receipt = await tx.wait();
    const seriesCreated = receipt?.logs?.find((log) => log.fragment?.name === "SeriesCreated");
    const seriesId = seriesCreated?.args?.id as string;

    await ivOracle.setIV(seriesId, ethers.parseUnits("0.5", 18));

    return {
      admin,
      trader,
      feeRecipient,
      optionToken,
      quoteToken,
      oracleRouter,
      ivOracle,
      market,
      seriesId
    };
  }

  it("quotes premium and fee for active series", async function () {
    const { market, seriesId } = await deployFixture();
    const size = ethers.parseUnits("1", 18);

    const [premium, fee] = await market.quote(seriesId, size);

    expect(premium).to.be.gt(0n);
    expect(fee).to.equal((premium * 50n) / 10_000n);
  });

  it("executes trade, mints position, transfers fees", async function () {
    const { market, seriesId, trader, optionToken, quoteToken, feeRecipient } = await deployFixture();
    const size = ethers.parseUnits("1", 18);

    const [premium, fee] = await market.quote(seriesId, size);
    const total = premium + fee;

    await quoteToken.connect(trader).approve(await market.getAddress(), total);

    const balanceBefore = await quoteToken.balanceOf(trader.address);
    const feeBefore = await quoteToken.balanceOf(feeRecipient.address);

    const tx = await market.connect(trader).trade(seriesId, size, total + ethers.parseUnits("1", 6));
    await expect(tx).to.emit(market, "TradeExecuted");

    const balanceAfter = await quoteToken.balanceOf(trader.address);
    const feeAfter = await quoteToken.balanceOf(feeRecipient.address);
    const positionBalance = await optionToken.balanceOf(trader.address, BigInt(seriesId));

    expect(balanceBefore - balanceAfter).to.equal(total);
    expect(feeAfter - feeBefore).to.equal(fee);
    expect(positionBalance).to.equal(size);
  });
});
