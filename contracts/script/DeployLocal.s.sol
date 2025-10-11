// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";

contract DeployLocal is Script {
    function run() external {
        bytes32 keyBytes = vm.envBytes32("DEPLOYER_PRIVATE_KEY");
        uint256 deployerPrivateKey = uint256(keyBytes);
        vm.startBroadcast(deployerPrivateKey);

        // TODO: deploy OptionToken, OptionsMarketV2, LiquidityVault, etc.

        vm.stopBroadcast();
    }
}
