// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IOracleRouter {
    function spot(address underlying) external view returns (uint256 price, uint8 decimals);
}
