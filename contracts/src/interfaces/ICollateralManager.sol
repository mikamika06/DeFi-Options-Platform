// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface ICollateralManager {
    function deposit(address account, address asset, uint256 amount) external;

    function withdraw(address account, address asset, uint256 amount) external;

    function getAccountMargin(address account) external view returns (uint256 equity, uint256 maintenance);

    function lockMargin(address account, uint256 amountWad, uint256 maintenanceWad) external;

    function releaseMargin(address account, uint256 amountWad, uint256 maintenanceReductionWad) external;

    function evaluateAccount(address account) external returns (uint256 equity, uint256 locked, uint256 maintenance);

    function updateMarginRequirements(address account, uint256 positionValueWad) external;

    function resolveLiquidation(address account) external;
}
