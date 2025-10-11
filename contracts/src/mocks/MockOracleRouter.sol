// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IOracleRouter} from "../interfaces/IOracleRouter.sol";

contract MockOracleRouter is IOracleRouter {
    uint256 private _price;
    uint8 private _decimals;

    constructor(uint256 price_, uint8 decimals_) {
        _price = price_;
        _decimals = decimals_;
    }

    function setPrice(uint256 newPrice) external {
        _price = newPrice;
    }

    function setDecimals(uint8 newDecimals) external {
        _decimals = newDecimals;
    }

    function spot(address) external view override returns (uint256 price, uint8 decimals) {
        return (_price, _decimals);
    }
}
