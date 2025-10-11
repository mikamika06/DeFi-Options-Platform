// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ICollateralManager} from "../interfaces/ICollateralManager.sol";

contract MockCollateralManager is ICollateralManager {
    mapping(address => mapping(address => uint256)) public balances;

    function deposit(address account, address asset, uint256 amount) external override {
        balances[account][asset] += amount;
    }

    function withdraw(address account, address asset, uint256 amount) external override {
        uint256 balance = balances[account][asset];
        require(balance >= amount, "insufficient");
        balances[account][asset] = balance - amount;
    }

    function getAccountMargin(address account) external view override returns (uint256 equity, uint256 maintenance) {
        account; // silence warning
        return (0, 0);
    }
}
