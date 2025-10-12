import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

import { LiquidityVault__factory } from "../types/factories/src/LiquidityVault__factory";
import { MockERC20__factory } from "../types/factories/src/mocks/MockERC20__factory";

describe("LiquidityVault full coverage", function () {
  async function deployFixture() {
    const [admin, lp1, lp2, feeCollector, handler, hedgeOperator] = await ethers.getSigners();
    const asset = await new MockERC20__factory(admin).deploy("MockUSDC", "mUSDC", 6, ethers.parseUnits("200000", 6), admin.address);
    await asset.waitForDeployment();

    const vault = await new LiquidityVault__factory(admin).deploy(
      await asset.getAddress(),
      "Vault Share",
      "vSHARE",
      admin.address,
      { performanceFeeBps: 0, managementFeeBps: 0, withdrawalCooldown: 3600 }
    );
    await vault.waitForDeployment();

    await asset.connect(admin).transfer(lp1.address, ethers.parseUnits("50000", 6));
    await asset.connect(admin).transfer(lp2.address, ethers.parseUnits("40000", 6));

    await asset.connect(lp1).approve(await vault.getAddress(), ethers.MaxUint256);
    await asset.connect(lp2).approve(await vault.getAddress(), ethers.MaxUint256);
    await asset.connect(admin).approve(await vault.getAddress(), ethers.MaxUint256);

    return { admin, lp1, lp2, feeCollector, handler, hedgeOperator, asset, vault };
  }

  it("constructor rejects zero admin", async function () {
    const asset = await new MockERC20__factory((await ethers.getSigners())[0]).deploy(
      "MockUSDC",
      "mUSDC",
      6,
      0,
      ethers.ZeroAddress
    );
    await asset.waitForDeployment();
    const factory = await ethers.getContractFactory("LiquidityVault");
    await expect(
      factory.deploy(await asset.getAddress(), "Vault", "VLT", ethers.ZeroAddress, {
        performanceFeeBps: 0,
        managementFeeBps: 0,
        withdrawalCooldown: 0
      })
    ).to.be.revertedWithCustomError(factory, "LiquidityVault_InvalidAddress");
  });

  it("manages configuration, roles, and pausing", async function () {
    const { admin, handler, hedgeOperator, vault } = await deployFixture();

    await expect(vault.connect(admin).setHedgeReserveBps(10_001)).to.be.revertedWith("hedge fee too high");
    await vault.connect(admin).setHedgeReserveBps(1500);
    expect(await vault.hedgeReserveBps()).to.equal(1500);

    await vault.connect(admin).setTrancheConfig({ performanceFeeBps: 100, managementFeeBps: 50, withdrawalCooldown: 10 });
    const config = await vault.trancheConfig();
    expect(config.performanceFeeBps).to.equal(100);

    await vault.connect(admin).setPremiumHandler(handler.address, true);
    expect(await vault.hasRole(await vault.PREMIUM_HANDLER_ROLE(), handler.address)).to.equal(true);
    await vault.connect(admin).setPremiumHandler(handler.address, false);
    expect(await vault.hasRole(await vault.PREMIUM_HANDLER_ROLE(), handler.address)).to.equal(false);

    await vault.connect(admin).setHedgeOperator(hedgeOperator.address);
    expect(await vault.hedgeOperator()).to.equal(hedgeOperator.address);

    await vault.connect(admin).pause();
    await expect(vault.deposit(1, admin.address)).to.be.revertedWithCustomError(vault, "EnforcedPause");
    await vault.connect(admin).unpause();
  });

  it("handles deposits, minting, cooldown withdrawals, and redemptions", async function () {
    const { lp1, lp2, vault, asset } = await deployFixture();

    const lp1Deposit = ethers.parseUnits("1000", 6);
    const lp2Deposit = ethers.parseUnits("2000", 6);

    await vault.connect(lp1).deposit(lp1Deposit, lp1.address);
    await vault.connect(lp2).mint(await vault.previewDeposit(lp2Deposit), lp2.address);

    const lp1Shares = await vault.balanceOf(lp1.address);
    const lp2Shares = await vault.balanceOf(lp2.address);
    expect(lp1Shares).to.be.gt(0n);
    expect(lp2Shares).to.be.gt(0n);

    await expect(vault.connect(lp1).withdraw(lp1Deposit, lp1.address, lp1.address)).to.be.revertedWithCustomError(
      vault,
      "LiquidityVault_CooldownActive"
    );

    await time.increase(3601);
    await vault.connect(lp1).withdraw(lp1Deposit / 2n, lp1.address, lp1.address);
    await vault.connect(lp2).redeem(lp2Shares / 2n, lp2.address, lp2.address);
  });

  it("collects fees, tracks premiums, losses, and settlements", async function () {
    const { admin, handler, feeCollector, asset, vault } = await deployFixture();
    const assetAddress = await asset.getAddress();

    await asset.connect(admin).transfer(feeCollector.address, ethers.parseUnits("1000", 6));
    await asset.connect(feeCollector).approve(await vault.getAddress(), ethers.MaxUint256);

    await expect(vault.connect(feeCollector).accruePerformanceFee(ethers.parseUnits("100", 6))).to.be.revertedWithCustomError(
      vault,
      "AccessControlUnauthorizedAccount"
    );

    await vault.connect(admin).grantRole(await vault.FEE_COLLECTOR_ROLE(), feeCollector.address);
    await vault.connect(feeCollector).accruePerformanceFee(ethers.parseUnits("100", 6));
    await vault.connect(feeCollector).accrueManagementFee(ethers.parseUnits("50", 6));

    await vault.connect(admin).setPremiumHandler(handler.address, true);
    await expect(
      vault.connect(handler).recordPremium(assetAddress, ethers.parseUnits("500", 6))
    ).to.emit(vault, "PremiumRecorded");

    await expect(
      vault.connect(handler).recordLoss(assetAddress, ethers.parseUnits("100", 6))
    ).to.emit(vault, "LossRecorded");

    await vault.connect(handler).handleSettlementPayout(assetAddress, ethers.parseUnits("200", 6));
    await vault.connect(admin).setPremiumHandler(handler.address, false);
  });

  it("manages tranches, protocol reserve, and hedge operations", async function () {
    const { admin, handler, hedgeOperator, asset, vault } = await deployFixture();
    const assetAddress = await asset.getAddress();

    await vault.connect(admin).setPremiumHandler(handler.address, true);
    await asset.connect(admin).transfer(await vault.getAddress(), ethers.parseUnits("1000", 6));
    await vault.connect(handler).recordPremium(assetAddress, ethers.parseUnits("1000", 6));

    const trancheId = ethers.keccak256(ethers.toUtf8Bytes("CUSTOM_TRANCH"));
    await vault.connect(admin).defineTranche(trancheId, 1000);
    await asset.connect(admin).transfer(await vault.getAddress(), ethers.parseUnits("500", 6));
    await vault.connect(handler).recordPremium(assetAddress, ethers.parseUnits("500", 6));

    await expect(vault.connect(admin).claimTranche(trancheId, admin.address)).to.emit(vault, "TrancheClaimed");
    await asset.connect(admin).transfer(await vault.getAddress(), ethers.parseUnits("300", 6));
    await vault.connect(handler).recordPremium(assetAddress, ethers.parseUnits("300", 6));
    await expect(vault.connect(admin).claimProtocolReserve(admin.address)).to.emit(vault, "ProtocolReserveClaimed");

    await vault.connect(admin).setHedgeOperator(hedgeOperator.address);
    await expect(vault.connect(handler).requestHedgeFunds(1, handler.address)).to.be.revertedWithCustomError(
      vault,
      "LiquidityVault_InvalidAddress"
    );

    await asset.connect(admin).transfer(await vault.getAddress(), ethers.parseUnits("500", 6));
    await vault.connect(handler).recordPremium(assetAddress, ethers.parseUnits("500", 6));
    await vault.connect(handler).recordLoss(assetAddress, ethers.parseUnits("100", 6));

    const hedgeBalance = await vault.hedgeReserveBalance();
    expect(hedgeBalance).to.be.gt(0n);
    await expect(
      vault.connect(hedgeOperator).requestHedgeFunds(hedgeBalance / 2n, hedgeOperator.address)
    ).to.emit(vault, "HedgeFundsDrawn");

    await asset.connect(admin).approve(await vault.getAddress(), ethers.MaxUint256);
    await asset.connect(admin).transfer(hedgeOperator.address, ethers.parseUnits("100", 6));
    await asset.connect(hedgeOperator).approve(await vault.getAddress(), ethers.MaxUint256);
    await vault.connect(hedgeOperator).returnHedgeProfit(ethers.parseUnits("50", 6));

    const trancheIds = await vault.getTrancheIds();
    expect(trancheIds.length).to.be.gte(2);
  });
});
