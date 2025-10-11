// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {OptionToken} from "./OptionToken.sol";
import {IOracleRouter} from "./interfaces/IOracleRouter.sol";
import {IIVOracle} from "./interfaces/IIVOracle.sol";
import {ICollateralManager} from "./interfaces/ICollateralManager.sol";

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
    address public feeRecipient;

    mapping(bytes32 => SeriesState) internal seriesState;
    bytes32[] internal seriesIds;

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
        collateralManager = newManager;
        emit CollateralManagerUpdated(address(newManager));
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
        uint256 total = premium + fee;

        emit QuoteEmitted(id, size, premium, fee);

        if (maxPremium != 0 && total > maxPremium) {
            revert OptionsMarket_SlippageExceeded(total, maxPremium);
        }

        IERC20 quoteAsset = IERC20(state.config.quote);
        quoteAsset.safeTransferFrom(msg.sender, address(this), total);
        if (fee > 0) {
            quoteAsset.safeTransfer(feeRecipient, fee);
        }

        optionToken.mint(msg.sender, uint256(id), size, "");

        state.longOpenInterest += uint128(size);
        state.totalPremiumCollected += uint128(total);
        state.lastIvUpdate = uint64(block.timestamp);

        emit TradeExecuted(id, msg.sender, size, premium, fee);
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
