// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ICollateralManager} from "../interfaces/ICollateralManager.sol";

contract MockCollateralManager is ICollateralManager {
    mapping(address => mapping(address => uint256)) public balances;
    mapping(address => uint256) public lockedMargin;
    mapping(address => uint256) public maintenanceMargin;
    mapping(address => bool) public liquidationStatus;

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
        return (0, maintenanceMargin[account]);
    }

    function lockMargin(address account, uint256 amountWad, uint256 maintenanceWad) external override {
        lockedMargin[account] += amountWad;
        maintenanceMargin[account] += maintenanceWad;
    }

    function releaseMargin(address account, uint256 amountWad, uint256 maintenanceReductionWad) external override {
        uint256 locked = lockedMargin[account];
        lockedMargin[account] = locked > amountWad ? locked - amountWad : 0;
        uint256 maintenance = maintenanceMargin[account];
        maintenanceMargin[account] = maintenanceReductionWad > maintenance ? 0 : maintenance - maintenanceReductionWad;
    }

    function evaluateAccount(address account)
        external
        override
        returns (uint256 equity, uint256 locked, uint256 maintenance)
    {
        liquidationStatus[account] = false;
        return (0, lockedMargin[account], maintenanceMargin[account]);
    }

    function resolveLiquidation(address account) external override {
        liquidationStatus[account] = false;
    }
}
