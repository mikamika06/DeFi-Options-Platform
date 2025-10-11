import { expect } from "chai";
import { ethers } from "hardhat";

describe("InsuranceFund", function () {
  it("accepts deposits and withdrawals for approved asset", async function () {
    const [admin, treasury] = await ethers.getSigners();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const usdc = await ERC20Mock.deploy("MockUSDC", "mUSDC", treasury.address, ethers.parseUnits("1000000", 6));
    await usdc.waitForDeployment();

    const InsuranceFund = await ethers.getContractFactory("InsuranceFund");
    const fund = await InsuranceFund.deploy(admin.address);
    await fund.waitForDeployment();

    await fund.connect(admin).setAssetApproval(await usdc.getAddress(), true);

    await usdc.connect(treasury).approve(await fund.getAddress(), ethers.MaxUint256);

    const depositAmount = ethers.parseUnits("100", 6);
    await fund.connect(admin).deposit(await usdc.getAddress(), depositAmount);

    const balanceBefore = await usdc.balanceOf(treasury.address);
    await fund.connect(admin).withdraw(await usdc.getAddress(), depositAmount, treasury.address);
    const balanceAfter = await usdc.balanceOf(treasury.address);

    expect(balanceAfter - balanceBefore).to.equal(0n);
  });
});
