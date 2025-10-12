import { expect } from "chai";
import { ethers } from "hardhat";

import { InsuranceFund__factory } from "../types/factories/src/InsuranceFund__factory";
import { MockERC20__factory } from "../types/factories/src/mocks/MockERC20__factory";

describe("InsuranceFund full coverage", function () {
  async function deployFixture() {
    const [admin, treasury, market, outsider] = await ethers.getSigners();
    const fund = await new InsuranceFund__factory(admin).deploy(admin.address);
    await fund.waitForDeployment();

    const asset = await new MockERC20__factory(admin).deploy("MockUSDC", "mUSDC", 6, ethers.parseUnits("100000", 6), treasury.address);
    await asset.waitForDeployment();

    await asset.connect(treasury).approve(await fund.getAddress(), ethers.MaxUint256);

    return { admin, treasury, market, outsider, fund, asset };
  }

  it("constructor rejects zero admin", async function () {
    const factory = await ethers.getContractFactory("InsuranceFund");
    await expect(factory.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(factory, "InsuranceFund_InvalidAddress");
  });

  it("manages asset approvals and market roles", async function () {
    const { admin, fund, asset, market } = await deployFixture();

    await expect(fund.connect(admin).setMarket(market.address, true))
      .to.emit(fund, "RoleGranted")
      .withArgs(await fund.MARKET_ROLE(), market.address, admin.address);
    await expect(fund.connect(admin).setMarket(market.address, false))
      .to.emit(fund, "RoleRevoked")
      .withArgs(await fund.MARKET_ROLE(), market.address, admin.address);

    await expect(
      fund.connect(admin).setAssetApproval(await asset.getAddress(), true)
    ).to.emit(fund, "AssetApproved");
  });

  it("processes deposits, premiums, coverage, withdrawals, and rescue", async function () {
    const { admin, treasury, market, outsider, fund, asset } = await deployFixture();
    const assetAddress = await asset.getAddress();

    await fund.connect(admin).setAssetApproval(assetAddress, true);
    await fund.connect(admin).setMarket(market.address, true);

    await expect(
      fund.connect(treasury).deposit(assetAddress, ethers.parseUnits("2000", 6))
    ).to.be.revertedWithCustomError(fund, "AccessControlUnauthorizedAccount");

    await fund.connect(admin).grantRole(await fund.TREASURER_ROLE(), treasury.address);
    await expect(fund.connect(treasury).deposit(assetAddress, ethers.parseUnits("2000", 6)))
      .to.emit(fund, "FundsDeposited")
      .withArgs(assetAddress, ethers.parseUnits("2000", 6), treasury.address);

    await expect(
      fund.connect(market).notifyPremium(assetAddress, ethers.parseUnits("200", 6))
    ).to.emit(fund, "PremiumNotified");

    await expect(
      fund.connect(market).requestCoverage(assetAddress, ethers.parseUnits("500", 6), ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(fund, "InsuranceFund_InvalidAddress");

    const coverageProvided = await fund
      .connect(market)
      .requestCoverage.staticCall(assetAddress, ethers.parseUnits("1500", 6), outsider.address);
    expect(coverageProvided).to.equal(ethers.parseUnits("1500", 6));

    await expect(
      fund.connect(market).requestCoverage(assetAddress, ethers.parseUnits("1500", 6), outsider.address)
    )
      .to.emit(fund, "CoverageProvided")
      .withArgs(assetAddress, ethers.parseUnits("1500", 6), ethers.parseUnits("1500", 6), outsider.address);

    await expect(
      fund.connect(treasury).withdraw(assetAddress, ethers.parseUnits("300", 6), treasury.address)
    ).to.emit(fund, "FundsWithdrawn");

    await expect(
      fund.connect(admin).rescue(assetAddress, ethers.parseUnits("100", 6), outsider.address)
    ).to.emit(fund, "RescueExecuted");
  });
});
