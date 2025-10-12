// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {OptionToken} from "./OptionToken.sol";
import {IOracleRouter} from "./interfaces/IOracleRouter.sol";
import {IIVOracle} from "./interfaces/IIVOracle.sol";
import {ICollateralManager} from "./interfaces/ICollateralManager.sol";
import {ILiquidityVault} from "./interfaces/ILiquidityVault.sol";
import {IInsuranceFund} from "./interfaces/IInsuranceFund.sol";

/**
 * @title OptionsMarketV2
 * @notice Core AMM contract for quoting and trading option series.
 *         This contract currently exposes storage, events, and administration helpers.
 *         Trading logic will be implemented in future iterations.
 */
abstract contract OptionsMarketV2 is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    bytes32 public constant RISK_MANAGER_ROLE = keccak256("RISK_MANAGER_ROLE");
    bytes32 public constant IV_UPDATER_ROLE = keccak256("IV_UPDATER_ROLE");
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");

    error OptionsMarket_InvalidAddress();
    error OptionsMarket_SeriesExists(bytes32 id);
    error OptionsMarket_SeriesNotFound(bytes32 id);
    error OptionsMarket_InvalidExpiry();
    error OptionsMarket_PastExpiry(bytes32 id);
    error OptionsMarket_InvalidSize();
    error OptionsMarket_SeriesSettled(bytes32 id);
    error OptionsMarket_InvalidDecimals();
    error OptionsMarket_InvalidVolatility();
    error OptionsMarket_InvalidSpot();
    error OptionsMarket_SlippageExceeded(uint256 actual, uint256 maxAllowed);
    error OptionsMarket_InsufficientLiquidity();
    error OptionsMarket_SizeTooLarge();

    struct SeriesConfig {
        address underlying;
        address quote;
        uint256 strike; // 60.18 fixed point
        uint64 expiry; // unix timestamp
        bool isCall;
        uint16 baseFeeBps;
    }

    struct SeriesState {
        SeriesConfig config;
        uint128 longOpenInterest;
        uint128 shortOpenInterest;
        uint128 totalPremiumCollected;
        uint64 createdAt;
        uint64 lastIvUpdate;
        bool settled;
    }

    OptionToken public immutable optionToken;
    IOracleRouter public oracleRouter;
    IIVOracle public ivOracle;
    ICollateralManager public collateralManager;
    ILiquidityVault public liquidityVault;
    IInsuranceFund public insuranceFund;
    address public feeRecipient;
    uint16 public insuranceFeeBps;
    uint16 public vaultSettlementShareBps;
    uint16 public insuranceSettlementShareBps;

mapping(bytes32 => SeriesState) internal seriesState;
bytes32[] internal seriesIds;
mapping(bytes32 => uint256) internal seriesPremiumReserve;
mapping(bytes32 => mapping(address => uint256)) internal userMarginWad;
mapping(bytes32 => mapping(address => uint256)) internal userPositionSize;
mapping(address => uint256) public accountMarginExposure;
mapping(bytes32 => mapping(address => uint256)) internal writerShortPositions;
mapping(bytes32 => mapping(address => uint256)) internal writerMarginWad;

    event SeriesCreated(
        bytes32 indexed id,
        address indexed underlying,
        address indexed quote,
        uint256 strike,
        uint64 expiry,
        bool isCall,
        uint16 baseFeeBps
    );

    event QuoteEmitted(bytes32 indexed id, uint256 size, uint256 premium, uint256 fee);
    event SeriesSettled(bytes32 indexed id);
    event FeeRecipientUpdated(address indexed recipient);
    event OracleRouterUpdated(address indexed oracle);
    event IVOracleUpdated(address indexed oracle);
    event CollateralManagerUpdated(address indexed collateralManager);
    event TradeExecuted(
        bytes32 indexed id,
        address indexed trader,
        uint256 size,
        uint256 premium,
        uint256 fee
    );
    event PositionClosed(
        bytes32 indexed id,
        address indexed account,
        uint256 size,
        uint256 payout,
        uint256 fee
    );
event PositionExercised(bytes32 indexed id, address indexed trader, uint256 size, uint256 payout);
event SeriesResidualSwept(bytes32 indexed id, address indexed recipient, uint256 amount);
event PositionLiquidated(
    bytes32 indexed id,
    address indexed account,
    address indexed initiator,
    uint256 size,
    uint256 payout
);
event ShortOpened(bytes32 indexed id, address indexed writer, address indexed recipient, uint256 size, uint256 marginWad);
event ShortClosed(bytes32 indexed id, address indexed writer, uint256 size, uint256 marginReleasedWad);

    enum CloseMode {
        Standard,
        Liquidation
    }

    struct CloseContext {
        uint256 premium;
        uint256 fee;
        uint256 reserve;
        uint256 payout;
        uint256 marginReleaseWad;
    }

    constructor(
        OptionToken optionToken_,
        IOracleRouter oracleRouter_,
        IIVOracle ivOracle_,
        ICollateralManager collateralManager_,
        address feeRecipient_,
        address admin
    ) {
        if (
            address(optionToken_) == address(0) ||
            address(oracleRouter_) == address(0) ||
            address(ivOracle_) == address(0) ||
            address(collateralManager_) == address(0) ||
            feeRecipient_ == address(0) ||
            admin == address(0)
        ) {
            revert OptionsMarket_InvalidAddress();
        }

        optionToken = optionToken_;
        oracleRouter = oracleRouter_;
        ivOracle = ivOracle_;
        collateralManager = collateralManager_;
        feeRecipient = feeRecipient_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(KEEPER_ROLE, admin);
        _grantRole(RISK_MANAGER_ROLE, admin);
        _grantRole(IV_UPDATER_ROLE, admin);
        _grantRole(LIQUIDATOR_ROLE, admin);
    }

    function getSeries(bytes32 id) external view returns (SeriesState memory) {
        SeriesState memory state = seriesState[id];
        if (state.config.underlying == address(0)) revert OptionsMarket_SeriesNotFound(id);
        return state;
    }

    function listSeriesIds() external view returns (bytes32[] memory) {
        return seriesIds;
    }

    function setFeeRecipient(address recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (recipient == address(0)) revert OptionsMarket_InvalidAddress();
        feeRecipient = recipient;
        emit FeeRecipientUpdated(recipient);
    }

    function setOracleRouter(IOracleRouter newRouter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (address(newRouter) == address(0)) revert OptionsMarket_InvalidAddress();
        oracleRouter = newRouter;
        emit OracleRouterUpdated(address(newRouter));
    }

    function setIvOracle(IIVOracle newOracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (address(newOracle) == address(0)) revert OptionsMarket_InvalidAddress();
        ivOracle = newOracle;
        emit IVOracleUpdated(address(newOracle));
    }

    function setCollateralManager(ICollateralManager newManager) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (address(newManager) == address(0)) revert OptionsMarket_InvalidAddress();
        address oldManager = address(collateralManager);
        if (oldManager != address(0)) {
            _revokeRole(LIQUIDATOR_ROLE, oldManager);
        }
        collateralManager = newManager;
        _grantRole(LIQUIDATOR_ROLE, address(newManager));
        emit CollateralManagerUpdated(address(newManager));
    }

    function setLiquidityVault(ILiquidityVault newVault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        liquidityVault = newVault;
    }

    function setInsuranceFund(IInsuranceFund newFund) external onlyRole(DEFAULT_ADMIN_ROLE) {
        insuranceFund = newFund;
    }

    function setInsuranceFeeBps(uint16 newFeeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFeeBps <= 10_000, "fee too high");
        insuranceFeeBps = newFeeBps;
    }

    function setSettlementShares(uint16 vaultShareBps, uint16 insuranceShareBps)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(vaultShareBps + insuranceShareBps <= 10_000, "shares too high");
        vaultSettlementShareBps = vaultShareBps;
        insuranceSettlementShareBps = insuranceShareBps;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function createSeries(SeriesConfig memory config) public onlyRole(DEFAULT_ADMIN_ROLE) returns (bytes32 id) {
        if (config.expiry <= block.timestamp) revert OptionsMarket_InvalidExpiry();
        if (config.underlying == address(0) || config.quote == address(0)) revert OptionsMarket_InvalidAddress();

        id = computeSeriesId(config);
        if (seriesState[id].config.underlying != address(0)) revert OptionsMarket_SeriesExists(id);

        seriesState[id] = SeriesState({
            config: config,
            longOpenInterest: 0,
            shortOpenInterest: 0,
            totalPremiumCollected: 0,
            createdAt: uint64(block.timestamp),
            lastIvUpdate: uint64(block.timestamp),
            settled: false
        });
        seriesIds.push(id);

        emit SeriesCreated(id, config.underlying, config.quote, config.strike, config.expiry, config.isCall, config.baseFeeBps);
    }

    function quote(bytes32 id, uint256 size) public view returns (uint256 premium, uint256 fee) {
        if (size == 0) revert OptionsMarket_InvalidSize();

        SeriesState storage state = seriesState[id];
        if (state.config.underlying == address(0)) revert OptionsMarket_SeriesNotFound(id);
        if (state.settled) revert OptionsMarket_SeriesSettled(id);
        if (state.config.expiry <= block.timestamp) revert OptionsMarket_PastExpiry(id);

        return _calculateQuote(state.config, id, size);
    }

    function trade(bytes32 id, uint256 size, uint256 maxPremium)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 premium, uint256 fee)
    {
        if (size == 0) revert OptionsMarket_InvalidSize();

        SeriesState storage state = seriesState[id];
        if (state.config.underlying == address(0)) revert OptionsMarket_SeriesNotFound(id);
        if (state.settled) revert OptionsMarket_SeriesSettled(id);
        if (state.config.expiry <= block.timestamp) revert OptionsMarket_PastExpiry(id);

        (premium, fee) = _calculateQuote(state.config, id, size);
        if (size > type(uint128).max - state.longOpenInterest) revert OptionsMarket_SizeTooLarge();

        uint256 insuranceCut = 0;
        if (address(insuranceFund) != address(0) && insuranceFeeBps > 0) {
            insuranceCut = (premium * insuranceFeeBps) / 10_000;
            if (insuranceCut > premium) {
                insuranceCut = premium;
            }
        }

        uint256 netPremium = premium - insuranceCut;
        uint256 total = premium + fee;

        emit QuoteEmitted(id, size, premium, fee);

        if (maxPremium != 0 && total > maxPremium) {
            revert OptionsMarket_SlippageExceeded(total, maxPremium);
        }

        IERC20 quoteAsset = IERC20(state.config.quote);
        quoteAsset.safeTransferFrom(msg.sender, address(this), total);
        if (insuranceCut > 0) {
            quoteAsset.safeTransfer(address(insuranceFund), insuranceCut);
            insuranceFund.notifyPremium(state.config.quote, insuranceCut);
        }
        if (fee > 0) {
            quoteAsset.safeTransfer(feeRecipient, fee);
        }

        optionToken.mint(msg.sender, uint256(id), size, "");

        state.longOpenInterest += uint128(size);
        state.totalPremiumCollected += uint128(total);
        state.lastIvUpdate = uint64(block.timestamp);
        seriesPremiumReserve[id] += netPremium;

        if (address(liquidityVault) != address(0)) {
            liquidityVault.recordPremium(state.config.quote, netPremium);
        }

        if (address(collateralManager) != address(0)) {
            uint8 quoteDecimals = IERC20Metadata(state.config.quote).decimals();
            uint256 marginWad = _toWadFromDecimals(netPremium, quoteDecimals);
            collateralManager.lockMargin(msg.sender, marginWad, marginWad / 2);
            userMarginWad[id][msg.sender] += marginWad;
            accountMarginExposure[msg.sender] += marginWad;
            collateralManager.updateMarginRequirements(msg.sender, accountMarginExposure[msg.sender]);
        }

        userPositionSize[id][msg.sender] += size;

        emit TradeExecuted(id, msg.sender, size, premium, fee);
    }

    function closePosition(bytes32 id, uint256 size, uint256 minPayout)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 payout, uint256 fee)
    {
        if (size == 0) revert OptionsMarket_InvalidSize();

        SeriesState storage state = seriesState[id];
        if (state.config.underlying == address(0)) revert OptionsMarket_SeriesNotFound(id);
        if (state.settled) revert OptionsMarket_SeriesSettled(id);
        if (block.timestamp >= state.config.expiry) revert OptionsMarket_PastExpiry(id);

        (payout, fee) = _closePositionInternal(
            id,
            msg.sender,
            size,
            minPayout,
            msg.sender,
            true,
            CloseMode.Standard,
            msg.sender
        );
    }

    function liquidatePosition(bytes32 id, address account, uint256 size, address receiver)
        external
        nonReentrant
        whenNotPaused
        onlyRole(LIQUIDATOR_ROLE)
        returns (uint256 payout, uint256 fee)
    {
        if (account == address(0)) revert OptionsMarket_InvalidAddress();
        SeriesState storage state = seriesState[id];
        if (state.config.underlying == address(0)) revert OptionsMarket_SeriesNotFound(id);
        if (state.settled) revert OptionsMarket_SeriesSettled(id);
        if (block.timestamp >= state.config.expiry) revert OptionsMarket_PastExpiry(id);

        address payoutReceiver = receiver == address(0) ? feeRecipient : receiver;
        (payout, fee) = _closePositionInternal(
            id,
            account,
            size,
            0,
            payoutReceiver,
            false,
            CloseMode.Liquidation,
            msg.sender
        );
    }

    function openShort(bytes32 id, uint256 size, address recipient)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 marginWad)
    {
        if (size == 0) revert OptionsMarket_InvalidSize();
        if (recipient == address(0)) revert OptionsMarket_InvalidAddress();

        SeriesState storage state = seriesState[id];
        if (state.config.underlying == address(0)) revert OptionsMarket_SeriesNotFound(id);
        if (state.settled) revert OptionsMarket_SeriesSettled(id);
        if (block.timestamp >= state.config.expiry) revert OptionsMarket_PastExpiry(id);

        (uint256 premium, ) = _calculateQuote(state.config, id, size);
        uint8 quoteDecimals = IERC20Metadata(state.config.quote).decimals();
        marginWad = _toWadFromDecimals(premium, quoteDecimals);

        writerShortPositions[id][msg.sender] += size;
        writerMarginWad[id][msg.sender] += marginWad;
        accountMarginExposure[msg.sender] += marginWad;

        if (address(collateralManager) != address(0)) {
            collateralManager.lockMargin(msg.sender, marginWad, marginWad / 2);
            collateralManager.updateMarginRequirements(msg.sender, accountMarginExposure[msg.sender]);
        }

        state.shortOpenInterest += uint128(size);
        optionToken.mint(recipient, uint256(id), size, "");

        emit ShortOpened(id, msg.sender, recipient, size, marginWad);
    }

    function closeShort(bytes32 id, uint256 size)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 marginReleasedWad)
    {
        if (size == 0) revert OptionsMarket_InvalidSize();

        SeriesState storage state = seriesState[id];
        if (state.config.underlying == address(0)) revert OptionsMarket_SeriesNotFound(id);
        if (state.settled) revert OptionsMarket_SeriesSettled(id);

        uint256 currentShort = writerShortPositions[id][msg.sender];
        if (currentShort < size) revert OptionsMarket_InvalidSize();
        if (optionToken.balanceOf(msg.sender, uint256(id)) < size) revert OptionsMarket_InvalidSize();

        writerShortPositions[id][msg.sender] = currentShort - size;
        require(state.shortOpenInterest >= uint128(size), "short OI too low");
        uint256 currentMargin = writerMarginWad[id][msg.sender];
        marginReleasedWad = currentMargin > 0 && currentShort > 0
            ? (currentMargin * size) / currentShort
            : 0;
        writerMarginWad[id][msg.sender] = currentMargin > marginReleasedWad ? currentMargin - marginReleasedWad : 0;

        if (marginReleasedWad > 0) {
            uint256 exposure = accountMarginExposure[msg.sender];
            accountMarginExposure[msg.sender] = exposure > marginReleasedWad ? exposure - marginReleasedWad : 0;
        }

        if (address(collateralManager) != address(0)) {
            if (marginReleasedWad > 0) {
                collateralManager.releaseMargin(msg.sender, marginReleasedWad, marginReleasedWad / 2);
            }
            collateralManager.updateMarginRequirements(msg.sender, accountMarginExposure[msg.sender]);
        }

        state.shortOpenInterest -= uint128(size);
        optionToken.burn(msg.sender, uint256(id), size);

        emit ShortClosed(id, msg.sender, size, marginReleasedWad);
    }

    function _closePositionInternal(
        bytes32 id,
        address account,
        uint256 size,
        uint256 minPayout,
        address payoutReceiver,
        bool enforceMinPayout,
        CloseMode mode,
        address initiator
    ) internal returns (uint256 payout, uint256 fee) {
        if (account == address(0)) revert OptionsMarket_InvalidAddress();
        SeriesState storage state = seriesState[id];

        if (optionToken.balanceOf(account, uint256(id)) < size) revert OptionsMarket_InvalidSize();

        CloseContext memory ctx;
        ctx.marginReleaseWad = _updateUserMargin(id, account, size);

        (ctx.premium, ctx.fee) = _calculateQuote(state.config, id, size);
        ctx.reserve = seriesPremiumReserve[id];
        if (ctx.premium > ctx.reserve) {
            uint256 covered = _requestCoverage(state.config.quote, ctx.premium - ctx.reserve);
            ctx.reserve += covered;
            if (ctx.premium > ctx.reserve) revert OptionsMarket_InsufficientLiquidity();
        }

        ctx.payout = ctx.premium;
        if (ctx.fee > 0) {
            ctx.payout = ctx.premium - ctx.fee;
        }

        if (enforceMinPayout && minPayout != 0 && ctx.payout < minPayout) {
            revert OptionsMarket_SlippageExceeded(minPayout, ctx.payout);
        }

        seriesPremiumReserve[id] = ctx.reserve - ctx.premium;
        state.longOpenInterest -= uint128(size);

        if (ctx.fee > 0) {
            IERC20(state.config.quote).safeTransfer(feeRecipient, ctx.fee);
        }
        IERC20(state.config.quote).safeTransfer(payoutReceiver, ctx.payout);

        optionToken.burn(account, uint256(id), size);

        if (address(liquidityVault) != address(0)) {
            liquidityVault.recordLoss(state.config.quote, ctx.premium);
        }

        if (ctx.marginReleaseWad > 0) {
            uint256 currentExposure = accountMarginExposure[account];
            accountMarginExposure[account] = currentExposure > ctx.marginReleaseWad
                ? currentExposure - ctx.marginReleaseWad
                : 0;
        }

        if (address(collateralManager) != address(0)) {
            if (ctx.marginReleaseWad > 0) {
                collateralManager.releaseMargin(account, ctx.marginReleaseWad, ctx.marginReleaseWad / 2);
            }
            collateralManager.updateMarginRequirements(account, accountMarginExposure[account]);
        }

        if (mode == CloseMode.Standard) {
            emit PositionClosed(id, account, size, ctx.payout, ctx.fee);
        } else {
            emit PositionLiquidated(id, account, initiator, size, ctx.payout);
        }

        payout = ctx.payout;
        fee = ctx.fee;
    }

    function exercise(bytes32 id, uint256 size, uint256 minPayout)
        external
        nonReentrant
        returns (uint256 payout)
    {
        if (size == 0) revert OptionsMarket_InvalidSize();

        SeriesState storage state = seriesState[id];
        if (state.config.underlying == address(0)) revert OptionsMarket_SeriesNotFound(id);
        if (block.timestamp < state.config.expiry) revert OptionsMarket_InvalidExpiry();

        if (optionToken.balanceOf(msg.sender, uint256(id)) < size) revert OptionsMarket_InvalidSize();

        uint256 marginReleaseWad = _updateUserMargin(id, msg.sender, size);
        if (marginReleaseWad > 0) {
            uint256 exposure = accountMarginExposure[msg.sender];
            accountMarginExposure[msg.sender] = exposure > marginReleaseWad
                ? exposure - marginReleaseWad
                : 0;
        }

        payout = _calculateIntrinsicPayout(state.config, size);
        uint256 reserve = seriesPremiumReserve[id];
        if (payout > reserve) {
            uint256 covered = _requestCoverage(state.config.quote, payout - reserve);
            reserve += covered;
            if (payout > reserve) revert OptionsMarket_InsufficientLiquidity();
        }
        if (minPayout != 0 && payout < minPayout) {
            revert OptionsMarket_SlippageExceeded(minPayout, payout);
        }

        seriesPremiumReserve[id] = reserve - payout;
        state.longOpenInterest -= uint128(size);

        optionToken.burn(msg.sender, uint256(id), size);

        if (payout > 0) {
            IERC20(state.config.quote).safeTransfer(msg.sender, payout);
        }

        if (address(liquidityVault) != address(0)) {
            liquidityVault.recordLoss(state.config.quote, payout);
        }

        if (address(collateralManager) != address(0)) {
            if (marginReleaseWad > 0) {
                collateralManager.releaseMargin(msg.sender, marginReleaseWad, marginReleaseWad / 2);
            }
            collateralManager.updateMarginRequirements(msg.sender, accountMarginExposure[msg.sender]);
        }

        emit PositionExercised(id, msg.sender, size, payout);

        if (state.longOpenInterest == 0 && !state.settled) {
            state.settled = true;
            emit SeriesSettled(id);
        }
    }

    function settleSeries(bytes32 id, address residualRecipient)
        external
        nonReentrant
        onlyRole(KEEPER_ROLE)
        returns (uint256 residual)
    {
        SeriesState storage state = seriesState[id];
        if (state.config.underlying == address(0)) revert OptionsMarket_SeriesNotFound(id);
        if (block.timestamp < state.config.expiry) revert OptionsMarket_InvalidExpiry();
        if (state.longOpenInterest != 0) revert OptionsMarket_InvalidSize();

        if (!state.settled) {
            state.settled = true;
            emit SeriesSettled(id);
        }

        residual = seriesPremiumReserve[id];
        if (residual > 0) {
            seriesPremiumReserve[id] = 0;

            IERC20 quoteAsset = IERC20(state.config.quote);
            uint256 vaultShare = 0;
            uint256 insuranceShare = 0;

            if (address(liquidityVault) != address(0) && vaultSettlementShareBps > 0) {
                vaultShare = (residual * vaultSettlementShareBps) / 10_000;
                if (vaultShare > 0) {
                    quoteAsset.safeTransfer(address(liquidityVault), vaultShare);
                    liquidityVault.handleSettlementPayout(state.config.quote, vaultShare);
                }
            }

            if (address(insuranceFund) != address(0) && insuranceSettlementShareBps > 0) {
                insuranceShare = (residual * insuranceSettlementShareBps) / 10_000;
                if (insuranceShare > 0) {
                    quoteAsset.safeTransfer(address(insuranceFund), insuranceShare);
                    insuranceFund.notifyPremium(state.config.quote, insuranceShare);
                }
            }

            uint256 remainder = residual - vaultShare - insuranceShare;
            address recipient = residualRecipient != address(0) ? residualRecipient : feeRecipient;
            if (remainder > 0 && recipient != address(0)) {
                quoteAsset.safeTransfer(recipient, remainder);
                emit SeriesResidualSwept(id, recipient, remainder);
            }
        }
    }

    function _calculateQuote(
        SeriesConfig memory config,
        bytes32 id,
        uint256 size
    ) internal view returns (uint256 premium, uint256 fee) {
        (uint256 spotRaw, uint8 spotDecimals) = oracleRouter.spot(config.underlying);
        if (spotRaw == 0) revert OptionsMarket_InvalidSpot();

        uint8 quoteDecimals = IERC20Metadata(config.quote).decimals();

        uint256 spot = _scaleToDecimals(spotRaw, spotDecimals, quoteDecimals);
        uint256 strike = _fromWadToDecimals(config.strike, quoteDecimals);

        uint256 intrinsic = _intrinsicValue(config.isCall, spot, strike);
        uint256 sigma = ivOracle.iv(id);
        if (sigma == 0) revert OptionsMarket_InvalidVolatility();

        uint256 extrinsic = (spot * sigma) / 1e18;
        uint256 premiumPerUnit = intrinsic + extrinsic;

        premium = (premiumPerUnit * size) / 1e18;
        fee = (premium * config.baseFeeBps) / 10_000;
    }

    function _scaleToDecimals(
        uint256 amount,
        uint8 currentDecimals,
        uint8 targetDecimals
    ) internal pure returns (uint256) {
        if (currentDecimals == targetDecimals) return amount;

        if (currentDecimals < targetDecimals) {
            uint256 diff = uint256(targetDecimals) - uint256(currentDecimals);
            if (diff > 36) revert OptionsMarket_InvalidDecimals();
            return amount * (10 ** diff);
        } else {
            uint256 diff = uint256(currentDecimals) - uint256(targetDecimals);
            if (diff > 36) revert OptionsMarket_InvalidDecimals();
            return amount / (10 ** diff);
        }
    }

    function _fromWadToDecimals(uint256 amountWad, uint8 decimals) internal pure returns (uint256) {
        if (decimals == 18) {
            return amountWad;
        } else if (decimals < 18) {
            uint256 diff = 18 - decimals;
            return amountWad / (10 ** diff);
        } else {
            uint256 diff = uint256(decimals) - 18;
            if (diff > 36) revert OptionsMarket_InvalidDecimals();
            return amountWad * (10 ** diff);
        }
    }

    function _intrinsicValue(
        bool isCall,
        uint256 spot,
        uint256 strike
    ) internal pure returns (uint256) {
        if (isCall) {
            return spot > strike ? spot - strike : 0;
        } else {
            return strike > spot ? strike - spot : 0;
        }
    }

    function _calculateIntrinsicPayout(SeriesConfig memory config, uint256 size) internal view returns (uint256) {
        (uint256 spotRaw, uint8 spotDecimals) = oracleRouter.spot(config.underlying);
        if (spotRaw == 0) revert OptionsMarket_InvalidSpot();

        uint8 quoteDecimals = IERC20Metadata(config.quote).decimals();

        uint256 spot = _scaleToDecimals(spotRaw, spotDecimals, quoteDecimals);
        uint256 strike = _fromWadToDecimals(config.strike, quoteDecimals);
        uint256 intrinsic = _intrinsicValue(config.isCall, spot, strike);

        return (intrinsic * size) / 1e18;
    }

    function _toWadFromDecimals(uint256 amount, uint8 decimals) internal pure returns (uint256) {
        if (decimals == 18) return amount;
        uint256 diff;
        if (decimals < 18) {
            diff = 18 - decimals;
            return amount * (10 ** diff);
        }
        diff = uint256(decimals) - 18;
        if (diff > 36) revert OptionsMarket_InvalidDecimals();
        return amount / (10 ** diff);
    }

    function _requestCoverage(address asset, uint256 amount) internal returns (uint256 covered) {
        if (amount == 0) return 0;
        if (address(insuranceFund) == address(0)) return 0;
        covered = insuranceFund.requestCoverage(asset, amount, address(this));
    }

    function _updateUserMargin(bytes32 id, address account, uint256 size) internal returns (uint256 released) {
        mapping(address => uint256) storage seriesMargins = userMarginWad[id];
        mapping(address => uint256) storage seriesPositions = userPositionSize[id];
        uint256 positionSize = seriesPositions[account];
        if (positionSize < size) revert OptionsMarket_InvalidSize();
        if (positionSize > 0) {
            uint256 locked = seriesMargins[account];
            if (locked > 0) {
                released = (locked * size) / positionSize;
                seriesMargins[account] = locked - released;
            }
        }
        seriesPositions[account] = positionSize - size;
    }

    function markSeriesSettled(bytes32 id) internal {
        SeriesState storage state = seriesState[id];
        if (state.config.underlying == address(0)) revert OptionsMarket_SeriesNotFound(id);
        if (state.settled) revert OptionsMarket_SeriesSettled(id);

        state.settled = true;
        emit SeriesSettled(id);
    }

    function computeSeriesId(SeriesConfig memory config) public pure returns (bytes32) {
        return keccak256(
            abi.encode(config.underlying, config.quote, config.strike, config.expiry, config.isCall)
        );
    }
}
