import { expect } from "chai";
import { ethers } from "hardhat";

import { CollateralManager__factory } from "../types/factories/src/CollateralManager__factory";
import { MockERC20__factory } from "../types/factories/src/mocks/MockERC20__factory";
import { MockOptionsLiquidation__factory } from "../types/factories/src/mocks/MockOptionsLiquidation__factory";

describe("CollateralManager full coverage", function () {
  async function deployFixture() {
    const [admin, user, market, liquidator, outsider] = await ethers.getSigners();

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

    const liquidationMock = await new MockOptionsLiquidation__factory(admin).deploy();
    await liquidationMock.waitForDeployment();

    await manager.connect(admin).grantRole(await manager.LIQUIDATOR_ROLE(), liquidator.address);

    return { admin, user, market, liquidator, outsider, manager, usdc, weth, liquidationMock };
  }

  it("constructor rejects zero admin", async function () {
    const factory = await ethers.getContractFactory("CollateralManager");
    await expect(factory.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(factory, "CollateralManager_InvalidAddress");
  });

  it("sets margin parameters with guard rails", async function () {
    const { manager, admin } = await deployFixture();
    await expect(manager.connect(admin).setMarginParameters(10_000, 12_000, 60)).to.be.revertedWith("init < maint");
    await expect(manager.connect(admin).setMarginParameters(60_000, 12_000, 60)).to.be.revertedWith("bps too high");
    await manager.connect(admin).setMarginParameters(20_000, 15_000, 0);
    expect(await manager.initialMarginBps()).to.equal(20_000);
    expect(await manager.maintenanceMarginBps()).to.equal(15_000);
    expect(await manager.marginCallGracePeriod()).to.equal(0);
  });

  it("manages asset configuration, prices, and pause state", async function () {
    const { manager, admin, outsider, usdc } = await deployFixture();
    await expect(
      manager.connect(admin).setAssetConfig(await usdc.getAddress(), {
        isEnabled: true,
        collateralFactorBps: 8000,
        liquidationThresholdBps: 9000,
        decimals: 40
      })
    ).to.be.revertedWithCustomError(manager, "CollateralManager_InvalidDecimals");

    await expect(manager.connect(admin).setAssetPrice(outsider.address, 1)).to.be.revertedWithCustomError(
      manager,
      "CollateralManager_AssetDisabled"
    );

    await manager.connect(admin).pause();
    await expect(
      manager.connect(outsider).deposit(outsider.address, await usdc.getAddress(), 1)
    ).to.be.revertedWithCustomError(manager, "EnforcedPause");
    await manager.connect(admin).unpause();
  });

  it("handles deposits, withdrawals, and equity-based restrictions", async function () {
    const { manager, admin, user, usdc } = await deployFixture();
    const asset = await usdc.getAddress();
    const depositAmount = ethers.parseUnits("1000", 6);

    await manager.connect(user).deposit(user.address, asset, depositAmount);
    expect(await manager.balanceOf(user.address, asset)).to.equal(depositAmount);

    await manager.connect(admin).lockMargin(user.address, ethers.parseUnits("300", 18), 0);
    await expect(manager.connect(user).withdraw(user.address, asset, depositAmount)).to.be.revertedWithCustomError(
      manager,
      "CollateralManager_InsufficientEquity"
    );

    await manager.connect(admin).releaseMargin(user.address, ethers.parseUnits("300", 18), 0);
    await manager.connect(user).withdraw(user.address, asset, ethers.parseUnits("400", 6));
    expect(await manager.balanceOf(user.address, asset)).to.equal(ethers.parseUnits("600", 6));
  });

  it("updates maintenance margin and enforces role checks", async function () {
    const { manager, admin, outsider, user } = await deployFixture();
    await expect(
      manager.connect(outsider).setMaintenanceMargin(user.address, ethers.parseUnits("1", 18))
    ).to.be.revertedWithCustomError(manager, "AccessControlUnauthorizedAccount");
    await expect(manager.connect(admin).setMaintenanceMargin(user.address, ethers.parseUnits("1", 18)))
      .to.emit(manager, "MaintenanceMarginUpdated")
      .withArgs(user.address, ethers.parseUnits("1", 18));
  });

  it("processes margin calls, liquidation states, and liquidation execution", async function () {
    const { manager, admin, market, liquidator, user, usdc, liquidationMock } = await deployFixture();
    const asset = await usdc.getAddress();
    await manager.connect(admin).setMarginParameters(20_000, 15_000, 0);

    await manager.connect(admin).setLiquidatableMarket(market.address, true);
    await manager.connect(admin).setLiquidatableMarket(await liquidationMock.getAddress(), true);

    await manager.connect(user).deposit(user.address, asset, ethers.parseUnits("5000", 6));
    await manager.connect(admin).lockMargin(user.address, ethers.parseUnits("2000", 18), ethers.parseUnits("1000", 18));

    await expect(manager.connect(admin).resolveLiquidation(user.address)).to.be.revertedWithCustomError(
      manager,
      "CollateralManager_NotInLiquidation"
    );

    await manager.connect(admin).setAssetPrice(asset, ethers.parseUnits("0.0001", 18));
    await manager.connect(admin).evaluateAccount(user.address);
    await manager.connect(admin).evaluateAccount(user.address);
    let status = await manager.getAccountStatus(user.address);
    expect(status.inLiquidation).to.equal(true);

    await expect(manager.connect(admin).resolveLiquidation(user.address))
      .to.emit(manager, "LiquidationResolved")
      .withArgs(user.address);
    status = await manager.getAccountStatus(user.address);
    expect(status.inLiquidation).to.equal(false);

    await manager.connect(admin).setAssetPrice(asset, ethers.parseUnits("0.00005", 18));
    await manager.connect(admin).evaluateAccount(user.address);
    await manager.connect(admin).evaluateAccount(user.address);
    status = await manager.getAccountStatus(user.address);
    expect(status.inLiquidation).to.equal(true);

    await liquidationMock.setResponse(ethers.parseUnits("250", 6), 0);
    await expect(
      manager
        .connect(admin)
        .executeLiquidation(await liquidationMock.getAddress(), ethers.ZeroHash, user.address, 1n, user.address)
    ).to.emit(manager, "LiquidationExecuted");

    await expect(
      manager.connect(liquidator).forceLiquidation(user.address, asset, ethers.parseUnits("100", 6))
    ).to.emit(manager, "AccountLiquidated");
  });

  it("restricts margin updates to approved callers", async function () {
    const { manager, admin, outsider, market, user } = await deployFixture();
    await expect(manager.connect(outsider).updateMarginRequirements(user.address, 0)).to.be.revertedWithCustomError(
      manager,
      "CollateralManager_MarketNotApproved"
    );

    await manager.connect(admin).setLiquidatableMarket(market.address, true);
    await manager.connect(market).updateMarginRequirements(user.address, ethers.parseUnits("100", 18));
    expect(await manager.accountExposureWad(user.address)).to.equal(ethers.parseUnits("100", 18));
  });
});
