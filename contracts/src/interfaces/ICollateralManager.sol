// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface ICollateralManager {
    function deposit(address account, address asset, uint256 amount) external;

    function withdraw(address account, address asset, uint256 amount) external;

    function getAccountMargin(address account) external view returns (uint256 equity, uint256 maintenance);
}
