import hre from "hardhat";

async function main() {
  const ethers = (hre as any).ethers;
  const [admin] = await ethers.getSigners();

  console.log("Deploying CleanERC20 with admin:", admin.address);

  const CleanERC20 = await ethers.getContractFactory("CleanERC20");
  const token = await CleanERC20.deploy();
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("CleanERC20 deployed to:", address);

  // Test mint
  console.log("Testing mint...");
  const mintTx = await token.mint(admin.address, ethers.parseUnits("1000", 6));
  await mintTx.wait();
  console.log("Mint successful!");

  // Test approve
  console.log("Testing approve...");
  const approveTx = await token.approve(address, ethers.parseUnits("500", 6));
  await approveTx.wait();
  console.log("Approve successful!");

  console.log("All tests passed! Contract address:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
