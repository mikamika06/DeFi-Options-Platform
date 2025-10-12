// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ILiquidityVault} from "../interfaces/ILiquidityVault.sol";

/**
 * @dev Simple in-memory mock that records calls for test assertions.
 */
contract MockLiquidityVault is ILiquidityVault {
    address public lastPremiumAsset;
    uint256 public lastPremiumAmount;
    uint256 public totalPremiumRecorded;

    address public lastLossAsset;
    uint256 public lastLossAmount;
    uint256 public totalLossRecorded;

    address public lastSettlementAsset;
    uint256 public lastSettlementAmount;
    uint256 public totalSettlementHandled;

    uint256 public premiumCallCount;
    uint256 public lossCallCount;
    uint256 public settlementCallCount;

    function recordPremium(address asset, uint256 amount) external override {
        lastPremiumAsset = asset;
        lastPremiumAmount = amount;
        totalPremiumRecorded += amount;
        premiumCallCount += 1;
    }

    function recordLoss(address asset, uint256 amount) external override {
        lastLossAsset = asset;
        lastLossAmount = amount;
        totalLossRecorded += amount;
        lossCallCount += 1;
    }

    function handleSettlementPayout(address asset, uint256 amount) external override {
        lastSettlementAsset = asset;
        lastSettlementAmount = amount;
        totalSettlementHandled += amount;
        settlementCallCount += 1;
    }
}
