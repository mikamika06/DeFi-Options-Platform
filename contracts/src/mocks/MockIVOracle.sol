// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IIVOracle} from "../interfaces/IIVOracle.sol";

contract MockIVOracle is IIVOracle {
    mapping(bytes32 => uint256) private _iv;

    function setIV(bytes32 id, uint256 sigmaWad) external {
        _iv[id] = sigmaWad;
    }

    function iv(bytes32 seriesId) external view override returns (uint256 sigmaWad) {
        return _iv[seriesId];
    }
}
