// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {OptionsMarketV2} from "../OptionsMarketV2.sol";
import {OptionToken} from "../OptionToken.sol";
import {IOracleRouter} from "../interfaces/IOracleRouter.sol";
import {IIVOracle} from "../interfaces/IIVOracle.sol";
import {ICollateralManager} from "../interfaces/ICollateralManager.sol";

contract OptionsMarketHarness is OptionsMarketV2 {
    constructor(
        OptionToken optionToken_,
        IOracleRouter oracleRouter_,
        IIVOracle ivOracle_,
        ICollateralManager collateralManager_,
        address feeRecipient_,
        address admin
    )
        OptionsMarketV2(optionToken_, oracleRouter_, ivOracle_, collateralManager_, feeRecipient_, admin)
    {}

    function settleSeries(bytes32 id) external onlyRole(KEEPER_ROLE) {
        markSeriesSettled(id);
    }

    function forceSetSeriesReserve(bytes32 id, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        seriesPremiumReserve[id] = amount;
    }

    function getSeriesReserve(bytes32 id) external view returns (uint256) {
        return seriesPremiumReserve[id];
    }

    function getUserMargin(bytes32 id, address account) external view returns (uint256) {
        return userMarginWad[id][account];
    }
}
