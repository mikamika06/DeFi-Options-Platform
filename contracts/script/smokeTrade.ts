import { readFileSync } from "fs";
import path from "path";
import hre from "hardhat";

async function main() {
  const ethers = hre.ethers;
  const [admin] = await ethers.getSigners();
  const traderKey = process.env.TRADER_PRIVATE_KEY;
  if (!traderKey) {
    throw new Error("TRADER_PRIVATE_KEY not configured in environment");
  }
  const trader = new ethers.Wallet(traderKey, ethers.provider);
  const deploymentsPath = path.join(__dirname, "..", "deployments", `${hre.network.name}.json`);
  const deployments = JSON.parse(readFileSync(deploymentsPath, "utf-8"));

  const quoteToken = await ethers.getContractAt("SimpleERC20", deployments.quoteToken);
  const underlyingToken = await ethers.getContractAt("SimpleERC20", deployments.underlyingToken);
  const optionsMarket = await ethers.getContractAt("OptionsMarketHarness", deployments.optionsMarket);
  const ivOracle = await ethers.getContractAt("MockIVOracle", deployments.ivOracle);
  const oracleRouter = await ethers.getContractAt("FlexibleOracleRouter", deployments.oracleRouter);
  const collateralManager = await ethers.getContractAt("CollateralManager", deployments.collateralManager);

  console.log("Using deployments:");
  console.log({
    quote: deployments.quoteToken,
    underlying: deployments.underlyingToken,
    market: deployments.optionsMarket,
    ivOracle: deployments.ivOracle,
    oracleRouter: deployments.oracleRouter,
    collateralManager: deployments.collateralManager
  });
  console.log("Admin:", admin.address);
  console.log("Trader:", trader.address);

  const seriesConfig = {
    underlying: await underlyingToken.getAddress(),
    quote: await quoteToken.getAddress(),
    strike: ethers.parseUnits("2000", 18),
    expiry: Math.floor(Date.now() / 1000) + 2 * 60 * 60, // +2h
    isCall: true,
    baseFeeBps: 100
  };

  const createTx = await optionsMarket.connect(admin).createSeries(seriesConfig);
  const createReceipt = await createTx.wait();

  const seriesId = await optionsMarket.computeSeriesId(seriesConfig);

  // ensure oracle & IV ready
  await oracleRouter.connect(admin).setAssetPrice(seriesConfig.underlying, ethers.parseUnits("2000", 6), 6);
  await oracleRouter.connect(admin).setAssetPrice(seriesConfig.quote, ethers.parseUnits("1", 6), 6);
  await ivOracle.connect(admin).setIV(seriesId, ethers.parseUnits("0.6", 18));

  // transfer quote tokens to trader if needed
  const desiredBalance = ethers.parseUnits("1000", 6);
  const traderBalance = await quoteToken.balanceOf(trader.address);
  if (traderBalance < desiredBalance) {
    const transferTx = await quoteToken.connect(admin).transfer(trader.address, desiredBalance - traderBalance);
    await transferTx.wait();
  }

  // approvals
  await (await quoteToken.connect(trader).approve(await optionsMarket.getAddress(), ethers.MaxUint256)).wait();
  await (await quoteToken.connect(trader).approve(await collateralManager.getAddress(), ethers.MaxUint256)).wait();

  // deposit a portion to collateral manager for margin accounting
  const depositAmount = ethers.parseUnits("500", 6);
  await (await collateralManager
    .connect(trader)
    .deposit(trader.address, await quoteToken.getAddress(), depositAmount)).wait();

  const size = ethers.parseUnits("1", 18);
  const quoteResult = await optionsMarket.quote.staticCall(seriesId, size);
  const premium = quoteResult[0];
  const fee = quoteResult[1];
  const maxPremium = premium + fee + (premium + fee) / BigInt(50); // +2% slippage

  const tradeTx = await optionsMarket.connect(trader).trade(seriesId, size, maxPremium);
  const tradeReceipt = await tradeTx.wait();

  const closeTx = await optionsMarket.connect(trader).closePosition(seriesId, size, 0);
  const closeReceipt = await closeTx.wait();

  console.log("Smoke test completed");
  console.log("Series ID:", seriesId);
  console.log("createSeries tx:", createReceipt?.hash);
  console.log("trade tx:", tradeReceipt?.hash);
  console.log("closePosition tx:", closeReceipt?.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
