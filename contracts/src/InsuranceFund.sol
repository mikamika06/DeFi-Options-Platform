// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title InsuranceFund
 * @notice Accumulates protocol fees and covers deficits resulting from liquidations.
 *         Funds can be deployed to approved strategies or transferred to liquidity pools.
 */
contract InsuranceFund is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");
    bytes32 public constant STRATEGIST_ROLE = keccak256("STRATEGIST_ROLE");
    bytes32 public constant MARKET_ROLE = keccak256("MARKET_ROLE");

    struct AssetBalance {
        uint256 totalDeposited;
        uint256 totalWithdrawn;
    }

    mapping(address => AssetBalance) public assetBalances;
    mapping(address => bool) public approvedAsset;

    event AssetApproved(address indexed asset, bool approved);
    event FundsDeposited(address indexed asset, uint256 amount, address indexed from);
    event FundsWithdrawn(address indexed asset, uint256 amount, address indexed to);
    event PremiumNotified(address indexed asset, uint256 amount);
    event CoverageProvided(address indexed asset, uint256 requested, uint256 provided, address indexed recipient);
    event RescueExecuted(address indexed asset, uint256 amount, address indexed recipient);

    error InsuranceFund_InvalidAddress();
    error InsuranceFund_AssetNotApproved();

    constructor(address admin) {
        if (admin == address(0)) revert InsuranceFund_InvalidAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TREASURER_ROLE, admin);
        _grantRole(STRATEGIST_ROLE, admin);
        _grantRole(MARKET_ROLE, admin);
    }

    function setAssetApproval(address asset, bool approved) external onlyRole(TREASURER_ROLE) {
        approvedAsset[asset] = approved;
        emit AssetApproved(asset, approved);
    }

    function setMarket(address market, bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (enabled) {
            _grantRole(MARKET_ROLE, market);
        } else {
            _revokeRole(MARKET_ROLE, market);
        }
    }

    function deposit(address asset, uint256 amount) external onlyRole(TREASURER_ROLE) {
        if (!approvedAsset[asset]) revert InsuranceFund_AssetNotApproved();

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        AssetBalance storage balance = assetBalances[asset];
        balance.totalDeposited += amount;

        emit FundsDeposited(asset, amount, msg.sender);
    }

    function notifyPremium(address asset, uint256 amount) external onlyRole(MARKET_ROLE) {
        if (!approvedAsset[asset]) revert InsuranceFund_AssetNotApproved();
        assetBalances[asset].totalDeposited += amount;
        emit PremiumNotified(asset, amount);
    }

    function requestCoverage(address asset, uint256 amount, address recipient)
        external
        onlyRole(MARKET_ROLE)
        returns (uint256 provided)
    {
        if (!approvedAsset[asset]) revert InsuranceFund_AssetNotApproved();
        if (recipient == address(0)) revert InsuranceFund_InvalidAddress();

        uint256 balance = IERC20(asset).balanceOf(address(this));
        provided = amount > balance ? balance : amount;
        if (provided > 0) {
            IERC20(asset).safeTransfer(recipient, provided);
            assetBalances[asset].totalWithdrawn += provided;
            emit CoverageProvided(asset, amount, provided, recipient);
        }
    }

    function withdraw(address asset, uint256 amount, address recipient) external onlyRole(TREASURER_ROLE) {
        if (!approvedAsset[asset]) revert InsuranceFund_AssetNotApproved();
        if (recipient == address(0)) revert InsuranceFund_InvalidAddress();

        IERC20(asset).safeTransfer(recipient, amount);

        AssetBalance storage balance = assetBalances[asset];
        balance.totalWithdrawn += amount;

        emit FundsWithdrawn(asset, amount, recipient);
    }

    function rescue(
        address asset,
        uint256 amount,
        address recipient
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(asset).safeTransfer(recipient, amount);
        emit RescueExecuted(asset, amount, recipient);
    }
}
