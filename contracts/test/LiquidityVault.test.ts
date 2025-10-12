import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityVault", function () {
  it("deposits, enforces cooldown on withdraw", async function () {
    const [admin, lp] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const asset = await MockERC20.deploy(
      "MockUSDC",
      "mUSDC",
      6,
      ethers.parseUnits("1000000", 6),
      admin.address
    );
    await asset.waitForDeployment();
    await asset.mint(lp.address, ethers.parseUnits("1000", 6));

    const LiquidityVault = await ethers.getContractFactory("LiquidityVault");
    const vault = await LiquidityVault.deploy(
      await asset.getAddress(),
      "Vault Share",
      "vSHARE",
      admin.address,
      { performanceFeeBps: 0, managementFeeBps: 0, withdrawalCooldown: 1 }
    );
    await vault.waitForDeployment();

    await asset.connect(lp).approve(await vault.getAddress(), ethers.MaxUint256);

    const depositAmount = ethers.parseUnits("100", 6);
    const shares = await vault.connect(lp).deposit.staticCall(depositAmount, lp.address);
    await vault.connect(lp).deposit(depositAmount, lp.address);

    expect(await vault.balanceOf(lp.address)).to.equal(shares);

    await expect(vault.connect(lp).withdraw(depositAmount, lp.address, lp.address)).to.be.revertedWithCustomError(
      vault,
      "LiquidityVault_CooldownActive"
    );

    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    await expect(vault.connect(lp).withdraw(depositAmount, lp.address, lp.address)).to.not.be.reverted;
  });
});
