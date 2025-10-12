// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IOptionsLiquidation} from "../interfaces/IOptionsLiquidation.sol";

contract MockOptionsLiquidation is IOptionsLiquidation {
    uint256 public lastSize;
    bytes32 public lastSeriesId;
    address public lastAccount;
    address public lastReceiver;
    uint256 public payoutToReturn;
    uint256 public feeToReturn;

    function setResponse(uint256 payout, uint256 fee) external {
        payoutToReturn = payout;
        feeToReturn = fee;
    }

    function liquidatePosition(bytes32 id, address account, uint256 size, address receiver)
        external
        override
        returns (uint256 payout, uint256 fee)
    {
        lastSeriesId = id;
        lastAccount = account;
        lastSize = size;
        lastReceiver = receiver;
        return (payoutToReturn, feeToReturn);
    }
}
