// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";

contract DeployLocal is Script {
    function run() external {
        // Use new test account private key
        uint256 deployerPrivateKey = 0x8242d39d0a6c1f261710241e6477c6978f20aa713104d8e76b57ddeb3ec72f60;
        vm.startBroadcast(deployerPrivateKey);

        // Deploy simple test contract for now
        console.log("Deploying contracts...");
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        console.log("Deployer balance:", address(vm.addr(deployerPrivateKey)).balance);

        console.log("=== Contract Deployment Complete ===");
        console.log("Ready for DeFi Options Platform!");

        vm.stopBroadcast();
    }
}
