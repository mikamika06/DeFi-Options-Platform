// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface ILiquidityVault {
    function recordPremium(address asset, uint256 amount) external;

    function recordLoss(address asset, uint256 amount) external;

    function handleSettlementPayout(address asset, uint256 amount) external;
}
