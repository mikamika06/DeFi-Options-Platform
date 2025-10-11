import { expect } from "chai";
import { ethers } from "hardhat";

describe("CollateralManager", function () {
  it("deposits and withdraws enabled collateral", async function () {
    const [admin, user] = await ethers.getSigners();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const usdc = await ERC20Mock.deploy("MockUSDC", "mUSDC", admin.address, ethers.parseUnits("1000000", 6));
    await usdc.waitForDeployment();
    await usdc.mint(user.address, ethers.parseUnits("1000", 6));

    const CollateralManager = await ethers.getContractFactory("CollateralManager");
    const manager = await CollateralManager.deploy(admin.address);
    await manager.waitForDeployment();

    await manager
      .connect(admin)
      .setAssetConfig(await usdc.getAddress(), { isEnabled: true, collateralFactorBps: 9000, liquidationThresholdBps: 9500 });

    await usdc.connect(user).approve(await manager.getAddress(), ethers.MaxUint256);

    const amount = ethers.parseUnits("100", 6);
    await manager.connect(user).deposit(user.address, await usdc.getAddress(), amount);

    expect(await manager.balanceOf(user.address, await usdc.getAddress())).to.equal(amount);

    await manager.connect(user).withdraw(user.address, await usdc.getAddress(), amount);
    expect(await manager.balanceOf(user.address, await usdc.getAddress())).to.equal(0n);
  });
});
