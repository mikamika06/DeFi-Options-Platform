// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ICollateralManager} from "./interfaces/ICollateralManager.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IOptionsLiquidation} from "./interfaces/IOptionsLiquidation.sol";

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
    bytes32 public constant MARGIN_ENGINE_ROLE = keccak256("MARGIN_ENGINE_ROLE");

    struct AssetConfig {
        bool isEnabled;
        uint16 collateralFactorBps;
        uint16 liquidationThresholdBps;
        uint8 decimals;
    }

    mapping(address => AssetConfig) public assetConfigs;
    mapping(address => uint256) public assetPriceWad; // price in quote asset with 1e18 precision
    mapping(address => bool) public supportedAsset;

    mapping(address => address[]) private accountAssetList;
    mapping(address => mapping(address => bool)) private accountAssetSeen;

    struct AccountStatus {
        bool inLiquidation;
        uint64 lastMarginCall;
    }

    mapping(address => mapping(address => uint256)) private accountBalances;
    mapping(address => uint256) public maintenanceMarginRequirement;
    mapping(address => uint256) public lockedMarginRequirement; // 1e18 precision
    mapping(address => AccountStatus) private accountStatus;
    mapping(address => bool) public liquidatableMarket;

    event AssetConfigUpdated(
        address indexed asset,
        bool isEnabled,
        uint16 collateralFactorBps,
        uint16 liquidationThresholdBps,
        uint8 decimals
    );
    event AssetPriceUpdated(address indexed asset, uint256 priceWad);
    event CollateralDeposited(address indexed account, address indexed asset, uint256 amount);
    event CollateralWithdrawn(address indexed account, address indexed asset, uint256 amount);
    event MaintenanceMarginUpdated(address indexed account, uint256 requirement);
    event AccountLiquidated(address indexed account, address indexed liquidator, address asset, uint256 amount);
    event LiquidatableMarketSet(address indexed market, bool approved);
    event LiquidationExecuted(address indexed market, bytes32 indexed seriesId, address indexed account, uint256 size, uint256 payout);
    event MarginLocked(address indexed account, uint256 amount, uint256 totalLocked);
    event MarginReleased(address indexed account, uint256 amount, uint256 totalLocked);
    event MarginCallIssued(address indexed account, uint256 equity, uint256 maintenance);
    event LiquidationStarted(address indexed account, uint256 equity, uint256 maintenance);
    event LiquidationResolved(address indexed account);

    error CollateralManager_InvalidAddress();
    error CollateralManager_AssetDisabled();
    error CollateralManager_InsufficientBalance();
    error CollateralManager_PriceNotSet();
    error CollateralManager_InvalidDecimals();
    error CollateralManager_InsufficientEquity();
    error CollateralManager_InLiquidation();
    error CollateralManager_NotInLiquidation();
    error CollateralManager_MarketNotApproved();

    constructor(address admin) {
        if (admin == address(0)) revert CollateralManager_InvalidAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MARGIN_ADMIN_ROLE, admin);
        _grantRole(LIQUIDATOR_ROLE, admin);
        _grantRole(MARGIN_ENGINE_ROLE, admin);
    }

    function setLiquidatableMarket(address market, bool approved) external onlyRole(MARGIN_ADMIN_ROLE) {
        if (market == address(0)) revert CollateralManager_InvalidAddress();
        liquidatableMarket[market] = approved;
        emit LiquidatableMarketSet(market, approved);
    }

    function setAssetConfig(address asset, AssetConfig calldata config) external onlyRole(MARGIN_ADMIN_ROLE) {
        if (asset == address(0)) revert CollateralManager_InvalidAddress();
        if (config.decimals > 36) revert CollateralManager_InvalidDecimals();

        assetConfigs[asset] = config;
        supportedAsset[asset] = true;
        emit AssetConfigUpdated(
            asset,
            config.isEnabled,
            config.collateralFactorBps,
            config.liquidationThresholdBps,
            config.decimals
        );
    }

    function setAssetPrice(address asset, uint256 priceWad) external onlyRole(MARGIN_ADMIN_ROLE) {
        if (!supportedAsset[asset]) revert CollateralManager_AssetDisabled();
        if (priceWad == 0) revert CollateralManager_PriceNotSet();

        assetPriceWad[asset] = priceWad;
        emit AssetPriceUpdated(asset, priceWad);
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
        if (accountStatus[account].inLiquidation) revert CollateralManager_InLiquidation();

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        accountBalances[account][asset] += amount;

        if (!accountAssetSeen[account][asset]) {
            accountAssetSeen[account][asset] = true;
            accountAssetList[account].push(asset);
        }

        emit CollateralDeposited(account, asset, amount);
    }

    function withdraw(address account, address asset, uint256 amount) external override whenNotPaused {
        AssetConfig memory config = assetConfigs[asset];
        if (!config.isEnabled) revert CollateralManager_AssetDisabled();
        if (accountStatus[account].inLiquidation) revert CollateralManager_InLiquidation();

        uint256 balance = accountBalances[account][asset];
        if (balance < amount) revert CollateralManager_InsufficientBalance();

        uint256 removalValue = _assetValue(asset, amount, config);
        uint256 equity = _computeEquity(account);
        uint256 locked = lockedMarginRequirement[account];
        if (equity <= locked) revert CollateralManager_InsufficientEquity();
        if (equity - removalValue < locked) revert CollateralManager_InsufficientEquity();

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

    function lockMargin(address account, uint256 amountWad, uint256 additionalMaintenanceWad)
        external
        onlyRole(MARGIN_ENGINE_ROLE)
        whenNotPaused
    {
        uint256 equity = _computeEquity(account);
        uint256 newLocked = lockedMarginRequirement[account] + amountWad;
        if (equity < newLocked) revert CollateralManager_InsufficientEquity();

        lockedMarginRequirement[account] = newLocked;
        if (additionalMaintenanceWad > 0) {
            maintenanceMarginRequirement[account] += additionalMaintenanceWad;
            emit MaintenanceMarginUpdated(account, maintenanceMarginRequirement[account]);
        }

        emit MarginLocked(account, amountWad, newLocked);
    }

    function releaseMargin(address account, uint256 amountWad, uint256 maintenanceReductionWad)
        external
        onlyRole(MARGIN_ENGINE_ROLE)
        whenNotPaused
    {
        uint256 locked = lockedMarginRequirement[account];
        uint256 newLocked = locked > amountWad ? locked - amountWad : 0;
        lockedMarginRequirement[account] = newLocked;

        if (maintenanceReductionWad > 0) {
            uint256 maintenance = maintenanceMarginRequirement[account];
            maintenanceMarginRequirement[account] = maintenanceReductionWad > maintenance
                ? 0
                : maintenance - maintenanceReductionWad;
            emit MaintenanceMarginUpdated(account, maintenanceMarginRequirement[account]);
        }

        emit MarginReleased(account, amountWad, newLocked);
    }

    function evaluateAccount(address account)
        external
        whenNotPaused
        returns (uint256 equity, uint256 locked, uint256 maintenance)
    {
        equity = _computeEquity(account);
        locked = lockedMarginRequirement[account];
        maintenance = maintenanceMarginRequirement[account];

        AccountStatus storage status = accountStatus[account];
        if (!status.inLiquidation && equity < maintenance) {
            status.lastMarginCall = uint64(block.timestamp);
            emit MarginCallIssued(account, equity, maintenance);
            if (equity < locked) {
                status.inLiquidation = true;
                emit LiquidationStarted(account, equity, maintenance);
            }
        }
    }

    function resolveLiquidation(address account)
        external
        onlyRole(LIQUIDATOR_ROLE)
    {
        AccountStatus storage status = accountStatus[account];
        if (!status.inLiquidation) revert CollateralManager_NotInLiquidation();
        status.inLiquidation = false;
        status.lastMarginCall = uint64(block.timestamp);
        emit LiquidationResolved(account);
    }

    function executeLiquidation(
        address market,
        bytes32 seriesId,
        address account,
        uint256 size,
        address payoutRecipient
    ) external onlyRole(LIQUIDATOR_ROLE) whenNotPaused {
        if (!liquidatableMarket[market]) revert CollateralManager_MarketNotApproved();
        AccountStatus storage status = accountStatus[account];
        if (!status.inLiquidation) revert CollateralManager_NotInLiquidation();
        (uint256 payout,) = IOptionsLiquidation(market).liquidatePosition(seriesId, account, size, payoutRecipient);
        emit LiquidationExecuted(market, seriesId, account, size, payout);
    }

    function balanceOf(address account, address asset) external view returns (uint256) {
        return accountBalances[account][asset];
    }

    function getAccountStatus(address account)
        external
        view
        returns (uint256 equity, uint256 locked, uint256 maintenance, bool inLiquidation, uint64 lastMarginCall)
    {
        equity = _computeEquity(account);
        locked = lockedMarginRequirement[account];
        maintenance = maintenanceMarginRequirement[account];
        AccountStatus memory status = accountStatus[account];
        inLiquidation = status.inLiquidation;
        lastMarginCall = status.lastMarginCall;
    }

    function _computeEquity(address account) internal view returns (uint256 equity) {
        address[] storage assets = accountAssetList[account];
        uint256 len = assets.length;

        for (uint256 i = 0; i < len; ++i) {
            address asset = assets[i];
            uint256 balance = accountBalances[account][asset];
            if (balance == 0) continue;

            AssetConfig memory config = assetConfigs[asset];
            if (!config.isEnabled) continue;

            uint256 price = assetPriceWad[asset];
            if (price == 0) revert CollateralManager_PriceNotSet();

            uint256 balanceWad = _toWad(balance, config.decimals);
            uint256 value = (balanceWad * price) / 1e18;
            equity += (value * config.collateralFactorBps) / 10_000;
        }
    }

    function _toWad(uint256 amount, uint8 decimals) internal pure returns (uint256) {
        if (decimals == 18) {
            return amount;
        } else if (decimals < 18) {
            uint256 diff = 18 - decimals;
            return amount * (10 ** diff);
        } else {
            uint256 diff = uint256(decimals) - 18;
            if (diff > 36) revert CollateralManager_InvalidDecimals();
            return amount / (10 ** diff);
        }
    }

    function _assetValue(address asset, uint256 amount, AssetConfig memory config) internal view returns (uint256) {
        uint256 price = assetPriceWad[asset];
        if (price == 0) revert CollateralManager_PriceNotSet();

        uint256 amountWad = _toWad(amount, config.decimals);
        return (amountWad * price * config.collateralFactorBps) / (1e18 * 10_000);
    }
}
