// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IOracleRouter} from "../interfaces/IOracleRouter.sol";

/**
 * @dev Oracle mock capable of storing independent spot prices and decimals per asset.
 *      Falls back to a default price when an asset hasn't been configured explicitly.
 */
contract FlexibleOracleRouter is IOracleRouter {
    struct AssetConfig {
        uint256 price;
        uint8 decimals;
        bool exists;
    }

    mapping(address => AssetConfig) private assetConfigs;
    AssetConfig private defaultConfig;

    constructor(uint256 defaultPrice, uint8 defaultDecimals) {
        defaultConfig = AssetConfig({price: defaultPrice, decimals: defaultDecimals, exists: true});
    }

    function setDefault(uint256 price, uint8 decimals) external {
        defaultConfig = AssetConfig({price: price, decimals: decimals, exists: true});
    }

    function setAssetPrice(address asset, uint256 price, uint8 decimals) external {
        assetConfigs[asset] = AssetConfig({price: price, decimals: decimals, exists: true});
    }

    function spot(address asset) external view override returns (uint256 price, uint8 decimals) {
        AssetConfig memory config = assetConfigs[asset];
        if (!config.exists) {
            config = defaultConfig;
        }
        return (config.price, config.decimals);
    }
}
