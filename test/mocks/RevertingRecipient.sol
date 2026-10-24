// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RevertingRecipient {
    // Reverts on any incoming native token transfer
    receive() external payable {
        revert("Rejecting payment");
    }
}
