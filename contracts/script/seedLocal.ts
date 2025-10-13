import { readFileSync } from "fs";
import path from "path";
import hre from "hardhat";

async function main() {
  const ethers = (hre as any).ethers;
  const network = hre.network;
  const deploymentsPath = path.join(
    __dirname,
    "..",
    "deployments",
    `${network.name}.json`
  );
  const deployments = JSON.parse(readFileSync(deploymentsPath, "utf8"));

  const [admin, trader] = await ethers.getSigners();

  const optionToken = await ethers.getContractAt(
    "OptionToken",
    deployments.optionToken
  );
  const market = await ethers.getContractAt(
    "OptionsMarketHarness",
    deployments.optionsMarket
  );
  const ivOracle = await ethers.getContractAt(
    "MockIVOracle",
    deployments.ivOracle
  );
  const quoteToken = await ethers.getContractAt(
    "MockERC20",
    deployments.quoteToken
  );
  const underlyingToken = await ethers.getContractAt(
    "MockERC20",
    deployments.underlyingToken
  );
  const collateralManager = await ethers.getContractAt(
    "CollateralManager",
    deployments.collateralManager
  );
  const liquidityVault = await ethers.getContractAt(
    "LiquidityVault",
    deployments.liquidityVault
  );
  const insuranceFund = await ethers.getContractAt(
    "InsuranceFund",
    deployments.insuranceFund
  );

  const traderInitialQuote = ethers.parseUnits("100000", 6);
  await quoteToken.connect(admin).transfer(trader.address, traderInitialQuote);
  await quoteToken
    .connect(trader)
    .approve(await market.getAddress(), ethers.MaxUint256);
  await quoteToken
    .connect(trader)
    .approve(await collateralManager.getAddress(), ethers.MaxUint256);
  await collateralManager
    .connect(trader)
    .deposit(
      trader.address,
      await quoteToken.getAddress(),
      ethers.parseUnits("50000", 6)
    );

  const adminInitialQuote = ethers.parseUnits("200000", 6);
  await quoteToken
    .connect(admin)
    .approve(await liquidityVault.getAddress(), ethers.MaxUint256);
  await liquidityVault.connect(admin).deposit(adminInitialQuote, admin.address);

  await quoteToken
    .connect(admin)
    .approve(await insuranceFund.getAddress(), ethers.MaxUint256);
  await insuranceFund
    .connect(admin)
    .deposit(await quoteToken.getAddress(), ethers.parseUnits("50000", 6));

  const expiry = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);
  const seriesConfig = {
    underlying: await underlyingToken.getAddress(),
    quote: await quoteToken.getAddress(),
    strike: ethers.parseUnits("1800", 18),
    expiry,
    isCall: true,
    baseFeeBps: 50,
  };

  const seriesId = await market.computeSeriesId(seriesConfig);
  const tx = await market.connect(admin).createSeries(seriesConfig);
  await tx.wait();
  await ivOracle.setIV(seriesId, ethers.parseUnits("0.4", 18));

  const tradeSize = ethers.parseUnits("5", 18);
  const [premium, fee] = await market.quote(seriesId, tradeSize);
  const maxPremium = premium + fee + (premium * 5n) / 100n;
  await market.connect(trader).trade(seriesId, tradeSize, maxPremium);

  console.log("✅ Seed completed");
  console.log(`   Series ID: ${seriesId}`);
  console.log(
    `   Trader position: ${(await optionToken.balanceOf(trader.address, seriesId)).toString()}`
  );
  console.log(
    `   Vault total shares: ${(await liquidityVault.totalSupply()).toString()} (asset balance: ${(
      await quoteToken.balanceOf(await liquidityVault.getAddress())
    ).toString()})`
  );
  console.log(
    `   Insurance fund balance: ${(
      await quoteToken.balanceOf(await insuranceFund.getAddress())
    ).toString()}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
