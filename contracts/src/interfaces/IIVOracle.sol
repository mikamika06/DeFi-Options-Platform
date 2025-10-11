// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IIVOracle {
    function iv(bytes32 seriesId) external view returns (uint256 sigmaWad);
}
