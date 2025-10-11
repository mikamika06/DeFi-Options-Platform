// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20, IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title LiquidityVault
 * @notice ERC-4626 style vault where LPs deposit collateral and receive shares.
 *         Each vault instance can represent a tranche with its own risk parameters.
 *         Integration hooks for hedging, fee accrual, and exposure tracking will be added later.
 */
contract LiquidityVault is ERC4626, AccessControl, Pausable {
    bytes32 public constant VAULT_MANAGER_ROLE = keccak256("VAULT_MANAGER_ROLE");
    bytes32 public constant FEE_COLLECTOR_ROLE = keccak256("FEE_COLLECTOR_ROLE");

    struct TrancheConfig {
        uint16 performanceFeeBps;
        uint16 managementFeeBps;
        uint32 withdrawalCooldown;
    }

    TrancheConfig public trancheConfig;

    mapping(address => uint256) public lastDepositTimestamp;

    event PerformanceFeeAccrued(uint256 amount);
    event ManagementFeeAccrued(uint256 amount);
    event TrancheConfigUpdated(uint16 performanceFeeBps, uint16 managementFeeBps, uint32 withdrawalCooldown);

    error LiquidityVault_InvalidAddress();
    error LiquidityVault_CooldownActive();

    constructor(
        IERC20Metadata asset_,
        string memory name_,
        string memory symbol_,
        address admin,
        TrancheConfig memory config
    ) ERC20(name_, symbol_) ERC4626(asset_) {
        if (admin == address(0)) revert LiquidityVault_InvalidAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VAULT_MANAGER_ROLE, admin);
        _grantRole(FEE_COLLECTOR_ROLE, admin);

        trancheConfig = config;
    }

    function setTrancheConfig(TrancheConfig calldata config) external onlyRole(VAULT_MANAGER_ROLE) {
        trancheConfig = config;
        emit TrancheConfigUpdated(config.performanceFeeBps, config.managementFeeBps, config.withdrawalCooldown);
    }

    function pause() external onlyRole(VAULT_MANAGER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(VAULT_MANAGER_ROLE) {
        _unpause();
    }

    function deposit(uint256 assets, address receiver)
        public
        override
        whenNotPaused
        returns (uint256 shares)
    {
        shares = super.deposit(assets, receiver);
        lastDepositTimestamp[receiver] = block.timestamp;
    }

    function mint(uint256 shares, address receiver)
        public
        override
        whenNotPaused
        returns (uint256 assets)
    {
        assets = super.mint(shares, receiver);
        lastDepositTimestamp[receiver] = block.timestamp;
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public override whenNotPaused returns (uint256 shares) {
        _checkCooldown(owner);
        shares = super.withdraw(assets, receiver, owner);
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public override whenNotPaused returns (uint256 assets) {
        _checkCooldown(owner);
        assets = super.redeem(shares, receiver, owner);
    }

    function accruePerformanceFee(uint256 amount) external onlyRole(FEE_COLLECTOR_ROLE) {
        emit PerformanceFeeAccrued(amount);
    }

    function accrueManagementFee(uint256 amount) external onlyRole(FEE_COLLECTOR_ROLE) {
        emit ManagementFeeAccrued(amount);
    }

    function _checkCooldown(address owner) internal view {
        uint32 cooldown = trancheConfig.withdrawalCooldown;
        if (cooldown == 0) return;
        uint256 lastDeposit = lastDepositTimestamp[owner];
        if (lastDeposit == 0) return;
        if (block.timestamp < lastDeposit + cooldown) revert LiquidityVault_CooldownActive();
    }
}
