// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IInsuranceFund} from "../interfaces/IInsuranceFund.sol";

/**
 * @dev Test double that records premium notifications and simulates coverage transfers.
 */
contract MockInsuranceFund is IInsuranceFund {
    address public lastNotifiedAsset;
    uint256 public lastNotifiedAmount;
    uint256 public totalPremiumNotified;

    address public lastCoverageAsset;
    uint256 public lastCoverageRequested;
    uint256 public lastCoverageProvided;
    address public lastCoverageRecipient;
    uint256 public totalCoverageProvided;

    uint256 public coverageBudget;

    function setCoverageBudget(uint256 budget) external {
        coverageBudget = budget;
    }

    function notifyPremium(address asset, uint256 amount) external override {
        lastNotifiedAsset = asset;
        lastNotifiedAmount = amount;
        totalPremiumNotified += amount;
    }

    function requestCoverage(address asset, uint256 amount, address recipient)
        external
        override
        returns (uint256 provided)
    {
        lastCoverageAsset = asset;
        lastCoverageRequested = amount;
        lastCoverageRecipient = recipient;

        if (coverageBudget < amount) {
            provided = coverageBudget;
        } else {
            provided = amount;
        }

        if (provided > 0) {
            coverageBudget -= provided;
            IERC20(asset).transfer(recipient, provided);
        }

        lastCoverageProvided = provided;
        totalCoverageProvided += provided;
    }
}
