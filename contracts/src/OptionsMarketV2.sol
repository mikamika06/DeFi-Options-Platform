// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

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
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    bytes32 public constant RISK_MANAGER_ROLE = keccak256("RISK_MANAGER_ROLE");
    bytes32 public constant IV_UPDATER_ROLE = keccak256("IV_UPDATER_ROLE");

    error OptionsMarket_InvalidAddress();
    error OptionsMarket_SeriesExists(bytes32 id);
    error OptionsMarket_SeriesNotFound(bytes32 id);
    error OptionsMarket_InvalidExpiry();
    error OptionsMarket_PastExpiry(bytes32 id);

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

    event SeriesSettled(bytes32 indexed id);
    event FeeRecipientUpdated(address indexed recipient);
    event OracleRouterUpdated(address indexed oracle);
    event IVOracleUpdated(address indexed oracle);
    event CollateralManagerUpdated(address indexed collateralManager);

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

    function markSeriesSettled(bytes32 id) internal {
        SeriesState storage state = seriesState[id];
        if (state.config.underlying == address(0)) revert OptionsMarket_SeriesNotFound(id);
        if (state.settled) revert OptionsMarket_PastExpiry(id);

        state.settled = true;
        emit SeriesSettled(id);
    }

    function computeSeriesId(SeriesConfig memory config) public pure returns (bytes32) {
        return keccak256(
            abi.encode(config.underlying, config.quote, config.strike, config.expiry, config.isCall)
        );
    }
}
