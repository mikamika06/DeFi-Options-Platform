// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IOptionsLiquidation {
    function liquidatePosition(bytes32 id, address account, uint256 size, address receiver)
        external
        returns (uint256 payout, uint256 fee);
}
