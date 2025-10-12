// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IInsuranceFund {
    function notifyPremium(address asset, uint256 amount) external;

    function requestCoverage(address asset, uint256 amount, address recipient) external returns (uint256);
}
