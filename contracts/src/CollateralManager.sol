// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {ICollateralManager} from "./interfaces/ICollateralManager.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CollateralManager
 * @notice Tracks user collateral balances, margin requirements, and liquidation thresholds.
 *         This skeleton focuses on deposits/withdrawals and simple equity tracking while
 *         reserving hooks for advanced margin logic.
 */
contract CollateralManager is AccessControl, Pausable, ICollateralManager {
    using SafeERC20 for IERC20;

    bytes32 public constant MARGIN_ADMIN_ROLE = keccak256("MARGIN_ADMIN_ROLE");
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");

    struct AssetConfig {
        bool isEnabled;
        uint16 collateralFactorBps;
        uint16 liquidationThresholdBps;
    }

    mapping(address => AssetConfig) public assetConfigs;

    mapping(address => mapping(address => uint256)) private accountBalances;
    mapping(address => uint256) public maintenanceMarginRequirement;

    event AssetConfigUpdated(address indexed asset, bool isEnabled, uint16 collateralFactorBps, uint16 liquidationThresholdBps);
    event CollateralDeposited(address indexed account, address indexed asset, uint256 amount);
    event CollateralWithdrawn(address indexed account, address indexed asset, uint256 amount);
    event MaintenanceMarginUpdated(address indexed account, uint256 requirement);
    event AccountLiquidated(address indexed account, address indexed liquidator, address asset, uint256 amount);

    error CollateralManager_InvalidAddress();
    error CollateralManager_AssetDisabled();
    error CollateralManager_InsufficientBalance();

    constructor(address admin) {
        if (admin == address(0)) revert CollateralManager_InvalidAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MARGIN_ADMIN_ROLE, admin);
        _grantRole(LIQUIDATOR_ROLE, admin);
    }

    function setAssetConfig(address asset, AssetConfig calldata config) external onlyRole(MARGIN_ADMIN_ROLE) {
        if (asset == address(0)) revert CollateralManager_InvalidAddress();
        assetConfigs[asset] = config;
        emit AssetConfigUpdated(asset, config.isEnabled, config.collateralFactorBps, config.liquidationThresholdBps);
    }

    function setMaintenanceMargin(address account, uint256 requirement) external onlyRole(MARGIN_ADMIN_ROLE) {
        maintenanceMarginRequirement[account] = requirement;
        emit MaintenanceMarginUpdated(account, requirement);
    }

    function pause() external onlyRole(MARGIN_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(MARGIN_ADMIN_ROLE) {
        _unpause();
    }

    function deposit(address account, address asset, uint256 amount) external override whenNotPaused {
        AssetConfig memory config = assetConfigs[asset];
        if (!config.isEnabled) revert CollateralManager_AssetDisabled();

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        accountBalances[account][asset] += amount;

        emit CollateralDeposited(account, asset, amount);
    }

    function withdraw(address account, address asset, uint256 amount) external override whenNotPaused {
        AssetConfig memory config = assetConfigs[asset];
        if (!config.isEnabled) revert CollateralManager_AssetDisabled();

        uint256 balance = accountBalances[account][asset];
        if (balance < amount) revert CollateralManager_InsufficientBalance();

        accountBalances[account][asset] = balance - amount;
        IERC20(asset).safeTransfer(account, amount);

        emit CollateralWithdrawn(account, asset, amount);
    }

    function getAccountMargin(address account)
        external
        view
        override
        returns (uint256 equity, uint256 maintenance)
    {
        maintenance = maintenanceMarginRequirement[account];
        equity = _computeEquity(account);
    }

    function forceLiquidation(address account, address asset, uint256 amount)
        external
        onlyRole(LIQUIDATOR_ROLE)
    {
        uint256 balance = accountBalances[account][asset];
        if (balance < amount) amount = balance;

        accountBalances[account][asset] = balance - amount;
        IERC20(asset).safeTransfer(msg.sender, amount);

        emit AccountLiquidated(account, msg.sender, asset, amount);
    }

    function balanceOf(address account, address asset) external view returns (uint256) {
        return accountBalances[account][asset];
    }

    function _computeEquity(address account) internal view returns (uint256 equity) {
        equity = 0;
        account; // placeholder until asset valuation is implemented
    }
}
