import { expect } from "chai";
import { ethers } from "hardhat";

describe("CollateralManager", function () {
  it("deposits and withdraws enabled collateral", async function () {
    const [admin, user] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("MockUSDC", "mUSDC", 6, ethers.parseUnits("1000000", 6), admin.address);
    await usdc.waitForDeployment();
    await usdc.mint(user.address, ethers.parseUnits("1000", 6));

    const CollateralManager = await ethers.getContractFactory("CollateralManager");
    const manager = await CollateralManager.deploy(admin.address);
    await manager.waitForDeployment();

    await manager.connect(admin).setAssetConfig(await usdc.getAddress(), {
      isEnabled: true,
      collateralFactorBps: 9000,
      liquidationThresholdBps: 9500,
      decimals: 6
    });

    await manager.connect(admin).setAssetPrice(await usdc.getAddress(), ethers.parseUnits("1", 18));

    await usdc.connect(user).approve(await manager.getAddress(), ethers.MaxUint256);

    const amount = ethers.parseUnits("100", 6);
    await manager.connect(user).deposit(user.address, await usdc.getAddress(), amount);

    expect(await manager.balanceOf(user.address, await usdc.getAddress())).to.equal(amount);

    await manager.connect(user).withdraw(user.address, await usdc.getAddress(), amount);
    expect(await manager.balanceOf(user.address, await usdc.getAddress())).to.equal(0n);
  });

  it("computes equity with collateral factor", async function () {
    const [admin, user] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("MockUSDC", "mUSDC", 6, ethers.parseUnits("1000000", 6), admin.address);
    await usdc.waitForDeployment();
    await usdc.mint(user.address, ethers.parseUnits("1000", 6));

    const CollateralManager = await ethers.getContractFactory("CollateralManager");
    const manager = await CollateralManager.deploy(admin.address);
    await manager.waitForDeployment();

    await manager.connect(admin).setAssetConfig(await usdc.getAddress(), {
      isEnabled: true,
      collateralFactorBps: 8000,
      liquidationThresholdBps: 9000,
      decimals: 6
    });

    await manager.connect(admin).setAssetPrice(await usdc.getAddress(), ethers.parseUnits("1", 18));

    await usdc.connect(user).approve(await manager.getAddress(), ethers.MaxUint256);
    const amount = ethers.parseUnits("150", 6);
    await manager.connect(user).deposit(user.address, await usdc.getAddress(), amount);

    const [equity] = await manager.getAccountMargin(user.address);
    const scale = 10n ** 12n; // convert 6 decimals to 1e18
    const expected = (amount * scale * 8000n) / 10_000n;
    expect(equity).to.equal(expected);
  });
});
