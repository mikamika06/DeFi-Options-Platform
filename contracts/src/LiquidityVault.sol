// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LiquidityVault
 * @notice ERC-4626 style vault where LPs deposit collateral and receive shares.
 *         Each vault instance can represent a tranche with its own risk parameters.
 *         Integration hooks for hedging, fee accrual, and exposure tracking will be added later.
 */
contract LiquidityVault is ERC4626, AccessControl, Pausable {
    bytes32 public constant VAULT_MANAGER_ROLE = keccak256("VAULT_MANAGER_ROLE");
    bytes32 public constant FEE_COLLECTOR_ROLE = keccak256("FEE_COLLECTOR_ROLE");
    bytes32 public constant PREMIUM_HANDLER_ROLE = keccak256("PREMIUM_HANDLER_ROLE");

    struct TrancheConfig {
        uint16 performanceFeeBps;
        uint16 managementFeeBps;
        uint32 withdrawalCooldown;
    }

    TrancheConfig public trancheConfig;

    mapping(address => uint256) public lastDepositTimestamp;
    mapping(address => uint256) public premiumReserves;
    mapping(bytes32 => TrancheShare) private trancheShares;
    bytes32[] private trancheIds;
    uint16 public totalTrancheWeightBps;
    uint16 public hedgeReserveBps;
    uint256 public hedgeReserveBalance;
    uint256 public protocolReserve;
    address public hedgeOperator;

    bytes32 private constant DEFAULT_TRANCHE_SENIOR = keccak256("TRANCHE_SENIOR");
    bytes32 private constant DEFAULT_TRANCHE_JUNIOR = keccak256("TRANCHE_JUNIOR");
    uint16 private constant DEFAULT_SENIOR_WEIGHT_BPS = 7000;
    uint16 private constant DEFAULT_JUNIOR_WEIGHT_BPS = 2000;
    uint16 private constant MAX_BPS = 10_000;

    event PerformanceFeeAccrued(uint256 amount);
    event ManagementFeeAccrued(uint256 amount);
    event TrancheConfigUpdated(uint16 performanceFeeBps, uint16 managementFeeBps, uint32 withdrawalCooldown);
    event PremiumRecorded(address indexed asset, uint256 amount);
    event LossRecorded(address indexed asset, uint256 amount);
    event TrancheDefined(bytes32 indexed trancheId, uint16 weightBps);
    event TrancheClaimed(bytes32 indexed trancheId, address indexed recipient, uint256 amount);
    event ProtocolReserveClaimed(address indexed recipient, uint256 amount);
    event HedgeReserveUpdated(uint16 hedgeReserveBps);
    event HedgeOperatorUpdated(address indexed operator);
    event HedgeFundsDrawn(address indexed recipient, uint256 amount);
    event SettlementHarvested(address indexed asset, uint256 amount);

    error LiquidityVault_InvalidAddress();
    error LiquidityVault_InvalidAsset();
    error LiquidityVault_CooldownActive();
    error LiquidityVault_InvalidTranche();
    error LiquidityVault_InvalidWeight();
    error LiquidityVault_InsufficientReserve();

    struct TrancheShare {
        uint16 weightBps;
        uint256 accruedAssets;
        bool exists;
    }

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
        _grantRole(PREMIUM_HANDLER_ROLE, admin);

        trancheConfig = config;
        hedgeReserveBps = 500; // 5% для hedge reserve

        _configureTranche(DEFAULT_TRANCHE_SENIOR, DEFAULT_SENIOR_WEIGHT_BPS);
        emit TrancheDefined(DEFAULT_TRANCHE_SENIOR, DEFAULT_SENIOR_WEIGHT_BPS);

        _configureTranche(DEFAULT_TRANCHE_JUNIOR, DEFAULT_JUNIOR_WEIGHT_BPS);
        emit TrancheDefined(DEFAULT_TRANCHE_JUNIOR, DEFAULT_JUNIOR_WEIGHT_BPS);
    }

    function setHedgeReserveBps(uint16 newBps) external onlyRole(VAULT_MANAGER_ROLE) {
        require(newBps <= MAX_BPS, "hedge fee too high");
        hedgeReserveBps = newBps;
        emit HedgeReserveUpdated(newBps);
    }

    function setHedgeOperator(address operator) external onlyRole(VAULT_MANAGER_ROLE) {
        hedgeOperator = operator;
        emit HedgeOperatorUpdated(operator);
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
        IERC20(asset()).transferFrom(msg.sender, address(this), amount);
        emit PerformanceFeeAccrued(amount);
    }

    function accrueManagementFee(uint256 amount) external onlyRole(FEE_COLLECTOR_ROLE) {
        IERC20(asset()).transferFrom(msg.sender, address(this), amount);
        emit ManagementFeeAccrued(amount);
    }

    function setPremiumHandler(address handler, bool enabled) external onlyRole(VAULT_MANAGER_ROLE) {
        if (enabled) {
            _grantRole(PREMIUM_HANDLER_ROLE, handler);
        } else {
            _revokeRole(PREMIUM_HANDLER_ROLE, handler);
        }
    }

    function defineTranche(bytes32 trancheId, uint16 weightBps) external onlyRole(VAULT_MANAGER_ROLE) {
        _configureTranche(trancheId, weightBps);
        emit TrancheDefined(trancheId, weightBps);
    }

    function recordPremium(address asset_, uint256 amount) external onlyRole(PREMIUM_HANDLER_ROLE) {
        if (asset_ != address(asset())) revert LiquidityVault_InvalidAsset();
        premiumReserves[asset_] += amount;

        uint256 hedgeCut = (amount * hedgeReserveBps) / 10_000;
        hedgeReserveBalance += hedgeCut;

        uint256 remaining = amount - hedgeCut;
        uint256 distributed;

        if (totalTrancheWeightBps > 0) {
            uint256 len = trancheIds.length;
            for (uint256 i = 0; i < len; i++) {
                TrancheShare storage tranche = trancheShares[trancheIds[i]];
                if (!tranche.exists || tranche.weightBps == 0) continue;
                uint256 share = (remaining * tranche.weightBps) / totalTrancheWeightBps;
                if (share > 0) {
                    tranche.accruedAssets += share;
                    distributed += share;
                }
            }
        }

        uint256 leftover = remaining - distributed;
        protocolReserve += leftover;

        emit PremiumRecorded(asset_, amount);
    }

    function recordLoss(address asset_, uint256 amount) external onlyRole(PREMIUM_HANDLER_ROLE) {
        if (asset_ != address(asset())) revert LiquidityVault_InvalidAsset();

        uint256 reserve = premiumReserves[asset_];
        premiumReserves[asset_] = amount >= reserve ? 0 : reserve - amount;

        uint256 remaining = amount;
        if (hedgeReserveBalance > 0) {
            uint256 deduct = remaining > hedgeReserveBalance ? hedgeReserveBalance : remaining;
            hedgeReserveBalance -= deduct;
            remaining -= deduct;
        }

        if (remaining > 0 && totalTrancheWeightBps > 0) {
            uint256 len = trancheIds.length;
            for (uint256 i = 0; i < len && remaining > 0; i++) {
                TrancheShare storage tranche = trancheShares[trancheIds[i]];
                if (!tranche.exists || tranche.weightBps == 0 || tranche.accruedAssets == 0) continue;
                uint256 share = (remaining * tranche.weightBps) / totalTrancheWeightBps;
                if (share == 0) share = remaining;
                uint256 deduction = share > tranche.accruedAssets ? tranche.accruedAssets : share;
                tranche.accruedAssets -= deduction;
                remaining -= deduction;
            }
        }

        if (remaining > 0) {
            uint256 deduct = remaining > protocolReserve ? protocolReserve : remaining;
            protocolReserve -= deduct;
            remaining -= deduct;
        }

        emit LossRecorded(asset_, amount);
    }

    function handleSettlementPayout(address asset_, uint256 amount) external onlyRole(PREMIUM_HANDLER_ROLE) {
        if (asset_ != address(asset())) revert LiquidityVault_InvalidAsset();
        premiumReserves[asset_] += amount;
        protocolReserve += amount;
        emit SettlementHarvested(asset_, amount);
    }

    function claimTranche(bytes32 trancheId, address recipient) external onlyRole(VAULT_MANAGER_ROLE) {
        TrancheShare storage tranche = trancheShares[trancheId];
        if (!tranche.exists) revert LiquidityVault_InvalidTranche();
        uint256 amount = tranche.accruedAssets;
        if (amount == 0) return;
        tranche.accruedAssets = 0;
        premiumReserves[address(asset())] = premiumReserves[address(asset())] >= amount
            ? premiumReserves[address(asset())] - amount
            : 0;
        IERC20(asset()).transfer(recipient, amount);
        emit TrancheClaimed(trancheId, recipient, amount);
    }

    function claimProtocolReserve(address recipient) external onlyRole(VAULT_MANAGER_ROLE) {
        uint256 amount = protocolReserve;
        if (amount == 0) return;
        protocolReserve = 0;
        premiumReserves[address(asset())] = premiumReserves[address(asset())] >= amount
            ? premiumReserves[address(asset())] - amount
            : 0;
        IERC20(asset()).transfer(recipient, amount);
        emit ProtocolReserveClaimed(recipient, amount);
    }

    function requestHedgeFunds(uint256 amount, address recipient) external {
        if (msg.sender != hedgeOperator) revert LiquidityVault_InvalidAddress();
        if (amount > hedgeReserveBalance) revert LiquidityVault_InsufficientReserve();
        hedgeReserveBalance -= amount;
        premiumReserves[address(asset())] = premiumReserves[address(asset())] >= amount
            ? premiumReserves[address(asset())] - amount
            : 0;
        IERC20(asset()).transfer(recipient, amount);
        emit HedgeFundsDrawn(recipient, amount);
    }

    function returnHedgeProfit(uint256 amount) external {
        IERC20(asset()).transferFrom(msg.sender, address(this), amount);
        hedgeReserveBalance += amount;
        premiumReserves[address(asset())] += amount;
    }

    function getTrancheIds() external view returns (bytes32[] memory) {
        return trancheIds;
    }

    function _configureTranche(bytes32 trancheId, uint16 weightBps) internal {
        if (trancheId == bytes32(0)) revert LiquidityVault_InvalidTranche();
        if (weightBps > MAX_BPS) revert LiquidityVault_InvalidWeight();

        TrancheShare storage tranche = trancheShares[trancheId];
        if (!tranche.exists) {
            tranche.exists = true;
            trancheIds.push(trancheId);
        } else {
            totalTrancheWeightBps -= tranche.weightBps;
        }

        tranche.weightBps = weightBps;
        totalTrancheWeightBps += weightBps;
        if (totalTrancheWeightBps > MAX_BPS) revert LiquidityVault_InvalidWeight();
    }

    function _checkCooldown(address owner) internal view {
        uint32 cooldown = trancheConfig.withdrawalCooldown;
        if (cooldown == 0) return;
        uint256 lastDeposit = lastDepositTimestamp[owner];
        if (lastDeposit == 0) return;
        if (block.timestamp < lastDeposit + cooldown) revert LiquidityVault_CooldownActive();
    }
}
