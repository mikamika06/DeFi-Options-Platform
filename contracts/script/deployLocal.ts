import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import hre from "hardhat";

async function main() {
  const ethers = (hre as any).ethers;
  const network = hre.network;
  const [admin, feeRecipient] = await ethers.getSigners();

  const MinimalERC20 = await ethers.getContractFactory("MinimalERC20");
  const OptionToken = await ethers.getContractFactory("OptionToken");
  const CollateralManager =
    await ethers.getContractFactory("CollateralManager");
  const LiquidityVault = await ethers.getContractFactory("LiquidityVault");
  const InsuranceFund = await ethers.getContractFactory("InsuranceFund");
  const FlexibleOracleRouter = await ethers.getContractFactory(
    "FlexibleOracleRouter"
  );
  const MockIVOracle = await ethers.getContractFactory("MockIVOracle");
  const OptionsMarketHarness = await ethers.getContractFactory(
    "OptionsMarketHarness"
  );

  const quoteToken = await MinimalERC20.deploy(
    ethers.parseUnits("10000000", 6),
    admin.address
  );
  await quoteToken.waitForDeployment();

  const underlyingToken = await MinimalERC20.deploy(
    ethers.parseUnits("1000000", 18),
    admin.address
  );
  await underlyingToken.waitForDeployment();

  const optionToken = await OptionToken.deploy(
    "https://local-options/{id}.json",
    admin.address
  );
  await optionToken.waitForDeployment();

  const collateralManager = await CollateralManager.deploy(admin.address);
  await collateralManager.waitForDeployment();

  const vaultConfig = {
    performanceFeeBps: 0,
    managementFeeBps: 0,
    withdrawalCooldown: 3600,
  };

  const liquidityVault = await LiquidityVault.deploy(
    await quoteToken.getAddress(),
    "Vault Share",
    "vSHARE",
    admin.address,
    vaultConfig
  );
  await liquidityVault.waitForDeployment();

  const insuranceFund = await InsuranceFund.deploy(admin.address);
  await insuranceFund.waitForDeployment();

  const oracleRouter = await FlexibleOracleRouter.deploy(
    ethers.parseUnits("2000", 6),
    6
  );
  await oracleRouter.waitForDeployment();
  await oracleRouter.setAssetPrice(
    await underlyingToken.getAddress(),
    ethers.parseUnits("2000", 6),
    6
  );
  await oracleRouter.setAssetPrice(
    await quoteToken.getAddress(),
    ethers.parseUnits("1", 6),
    6
  );

  const ivOracle = await MockIVOracle.deploy();
  await ivOracle.waitForDeployment();

  const optionsMarket = await OptionsMarketHarness.deploy(
    await optionToken.getAddress(),
    await oracleRouter.getAddress(),
    await ivOracle.getAddress(),
    await collateralManager.getAddress(),
    feeRecipient.address,
    admin.address
  );
  await optionsMarket.waitForDeployment();

  const marketAddress = await optionsMarket.getAddress();
  const quoteAddress = await quoteToken.getAddress();
  const underlyingAddress = await underlyingToken.getAddress();

  const usdcConfig = {
    isEnabled: true,
    collateralFactorBps: 9000,
    liquidationThresholdBps: 9500,
    decimals: 6,
  };
  await collateralManager
    .connect(admin)
    .setAssetConfig(quoteAddress, usdcConfig);
  await collateralManager
    .connect(admin)
    .setAssetPrice(quoteAddress, ethers.parseUnits("1", 18));

  const wethConfig = {
    isEnabled: true,
    collateralFactorBps: 8000,
    liquidationThresholdBps: 9000,
    decimals: 18,
  };
  await collateralManager
    .connect(admin)
    .setAssetConfig(underlyingAddress, wethConfig);
  await collateralManager
    .connect(admin)
    .setAssetPrice(underlyingAddress, ethers.parseUnits("2000", 18));

  await collateralManager
    .connect(admin)
    .grantRole(await collateralManager.MARGIN_ENGINE_ROLE(), marketAddress);
  await collateralManager
    .connect(admin)
    .grantRole(await collateralManager.LIQUIDATOR_ROLE(), marketAddress);

  await optionToken.connect(admin).grantRoles(marketAddress);

  await liquidityVault.connect(admin).setPremiumHandler(marketAddress, true);
  await liquidityVault.connect(admin).setHedgeOperator(admin.address);

  await insuranceFund.connect(admin).setAssetApproval(quoteAddress, true);
  await insuranceFund.connect(admin).setMarket(marketAddress, true);

  await optionsMarket
    .connect(admin)
    .setLiquidityVault(await liquidityVault.getAddress());
  await optionsMarket
    .connect(admin)
    .setInsuranceFund(await insuranceFund.getAddress());
  await optionsMarket.connect(admin).setInsuranceFeeBps(500);
  await optionsMarket.connect(admin).setSettlementShares(2000, 2000);

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  mkdirSync(deploymentsDir, { recursive: true });
  const filePath = path.join(deploymentsDir, `${network.name}.json`);
  const data = {
    network: network.name,
    admin: admin.address,
    feeRecipient: feeRecipient.address,
    optionToken: await optionToken.getAddress(),
    collateralManager: await collateralManager.getAddress(),
    liquidityVault: await liquidityVault.getAddress(),
    insuranceFund: await insuranceFund.getAddress(),
    oracleRouter: await oracleRouter.getAddress(),
    ivOracle: await ivOracle.getAddress(),
    optionsMarket: marketAddress,
    quoteToken: quoteAddress,
    underlyingToken: underlyingAddress,
  };
  writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Contracts deployed. Addresses saved to ${filePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
