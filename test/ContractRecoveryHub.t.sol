// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {ContractRecoveryHub} from "../contracts/ContractRecoveryHub.sol";
import {RevertingRecipient} from "./mocks/RevertingRecipient.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract ContractRecoveryHubTest is Test {
    ContractRecoveryHub public hub;
    address public owner;
    address public user1;
    address public user2;
    uint256 public constant INITIAL_PRICE = 0.5 ether; // 0.5 BOT

    event ScanRequested(
        bytes32 indexed scanId,
        address indexed user,
        ContractRecoveryHub.ScanType indexed scanType,
        uint256 amountPaid,
        uint256 timestamp
    );
    event DeepScanPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event RevenueWithdrawn(address indexed recipient, uint256 amount);

    function setUp() public {
        owner = makeAddr("owner");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);

        vm.prank(owner);
        hub = new ContractRecoveryHub(owner, INITIAL_PRICE);
    }

    // 1. Initial State
    function test_InitialState() public view {
        assertEq(hub.owner(), owner);
        assertEq(hub.deepScanPrice(), INITIAL_PRICE);
        assertEq(hub.paused(), false);
        assertEq(address(hub).balance, 0);
    }

    // 2. Free Scan Registration
    function test_RequestFreeScan_Success() public {
        vm.prank(user1);
        vm.expectEmit(false, true, true, false);
        emit ScanRequested(
            bytes32(0),
            user1,
            ContractRecoveryHub.ScanType.Free,
            0,
            block.timestamp
        );

        bytes32 scanId = hub.requestFreeScan();
        assertTrue(scanId != bytes32(0));

        (
            address reqUser,
            ContractRecoveryHub.ScanType sType,
            uint256 amt,
            uint256 time,
            bool exists
        ) = hub.getScanRequest(scanId);

        assertEq(reqUser, user1);
        assertTrue(sType == ContractRecoveryHub.ScanType.Free);
        assertEq(amt, 0);
        assertEq(time, block.timestamp);
        assertTrue(exists);

        bytes32[] memory userScans = hub.getUserScanIds(user1);
        assertEq(userScans.length, 1);
        assertEq(userScans[0], scanId);
    }

    // 3. Scan ID Uniqueness
    function test_ScanId_Uniqueness() public {
        vm.prank(user1);
        bytes32 id1 = hub.requestFreeScan();

        vm.prank(user1);
        bytes32 id2 = hub.requestFreeScan();

        vm.prank(user2);
        bytes32 id3 = hub.requestFreeScan();

        assertTrue(id1 != id2);
        assertTrue(id2 != id3);
        assertTrue(id1 != id3);
    }

    // 4. Paid Deep Scan - Exact Payment
    function test_RequestDeepScan_ExactPayment_Success() public {
        vm.prank(user1);
        vm.expectEmit(false, true, true, true);
        emit ScanRequested(
            bytes32(0),
            user1,
            ContractRecoveryHub.ScanType.Deep,
            INITIAL_PRICE,
            block.timestamp
        );

        bytes32 scanId = hub.requestDeepScan{value: INITIAL_PRICE}();
        assertTrue(scanId != bytes32(0));

        (
            address reqUser,
            ContractRecoveryHub.ScanType sType,
            uint256 amt,
            uint256 time,
            bool exists
        ) = hub.getScanRequest(scanId);

        assertEq(reqUser, user1);
        assertTrue(sType == ContractRecoveryHub.ScanType.Deep);
        assertEq(amt, INITIAL_PRICE);
        assertEq(time, block.timestamp);
        assertTrue(exists);
        assertEq(address(hub).balance, INITIAL_PRICE);
    }

    // 5. Underpayment Rejection
    function test_RequestDeepScan_RevertOnUnderpayment() public {
        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(
                ContractRecoveryHub.InvalidPayment.selector,
                INITIAL_PRICE - 1,
                INITIAL_PRICE
            )
        );
        hub.requestDeepScan{value: INITIAL_PRICE - 1}();
    }

    // 6. Overpayment Rejection
    function test_RequestDeepScan_RevertOnOverpayment() public {
        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(
                ContractRecoveryHub.InvalidPayment.selector,
                INITIAL_PRICE + 1,
                INITIAL_PRICE
            )
        );
        hub.requestDeepScan{value: INITIAL_PRICE + 1}();
    }

    // 7. Zero payment for deep scan rejection
    function test_RequestDeepScan_RevertOnZeroPayment() public {
        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(
                ContractRecoveryHub.InvalidPayment.selector,
                0,
                INITIAL_PRICE
            )
        );
        hub.requestDeepScan{value: 0}();
    }

    // 8. Price Update by Owner
    function test_SetDeepScanPrice_ByOwner() public {
        uint256 newPrice = 1 ether;
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit DeepScanPriceUpdated(INITIAL_PRICE, newPrice);

        hub.setDeepScanPrice(newPrice);
        assertEq(hub.deepScanPrice(), newPrice);

        // User must pay new price
        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(
                ContractRecoveryHub.InvalidPayment.selector,
                INITIAL_PRICE,
                newPrice
            )
        );
        hub.requestDeepScan{value: INITIAL_PRICE}();

        // Exact new payment succeeds
        vm.prank(user1);
        hub.requestDeepScan{value: newPrice}();
    }

    // 9. Price Update by Non-Owner Reverts
    function test_SetDeepScanPrice_RevertUnauthorized() public {
        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                user1
            )
        );
        hub.setDeepScanPrice(2 ether);
    }

    // 10. Pause & Unpause Behavior
    function test_Pause_Unpause_Controls() public {
        vm.prank(owner);
        hub.pause();
        assertTrue(hub.paused());

        // Free scan fails when paused
        vm.prank(user1);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        hub.requestFreeScan();

        // Deep scan fails when paused
        vm.prank(user1);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        hub.requestDeepScan{value: INITIAL_PRICE}();

        // Unpause
        vm.prank(owner);
        hub.unpause();
        assertFalse(hub.paused());

        // Can scan again
        vm.prank(user1);
        bytes32 scanId = hub.requestFreeScan();
        assertTrue(scanId != bytes32(0));
    }

    // 11. Pause by Non-Owner Reverts
    function test_Pause_RevertUnauthorized() public {
        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                user1
            )
        );
        hub.pause();
    }

    // 12. Revenue Withdrawal - Success
    function test_WithdrawRevenue_Success() public {
        // Collect revenue from deep scan
        vm.prank(user1);
        hub.requestDeepScan{value: INITIAL_PRICE}();

        address payable recipient = payable(makeAddr("treasury"));
        uint256 recipientPreBalance = recipient.balance;

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit RevenueWithdrawn(recipient, INITIAL_PRICE);

        hub.withdrawRevenue(recipient);

        assertEq(recipient.balance, recipientPreBalance + INITIAL_PRICE);
        assertEq(address(hub).balance, 0);
    }

    // 13. Revenue Withdrawal - Zero Balance Reverts
    function test_WithdrawRevenue_RevertOnZeroBalance() public {
        address payable recipient = payable(makeAddr("treasury"));
        vm.prank(owner);
        vm.expectRevert(ContractRecoveryHub.NoRevenueToWithdraw.selector);
        hub.withdrawRevenue(recipient);
    }

    // 14. Revenue Withdrawal - Invalid Recipient (Zero Address) Reverts
    function test_WithdrawRevenue_RevertOnZeroAddress() public {
        vm.prank(user1);
        hub.requestDeepScan{value: INITIAL_PRICE}();

        vm.prank(owner);
        vm.expectRevert(ContractRecoveryHub.InvalidRecipient.selector);
        hub.withdrawRevenue(payable(address(0)));
    }

    // 15. Revenue Withdrawal - Non-Owner Reverts
    function test_WithdrawRevenue_RevertUnauthorized() public {
        vm.prank(user1);
        hub.requestDeepScan{value: INITIAL_PRICE}();

        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                user1
            )
        );
        hub.withdrawRevenue(payable(user1));
    }

    // 16. Revenue Withdrawal - Failed Transfer Reverts
    function test_WithdrawRevenue_RevertOnFailedTransfer() public {
        vm.prank(user1);
        hub.requestDeepScan{value: INITIAL_PRICE}();

        RevertingRecipient rejectingContract = new RevertingRecipient();

        vm.prank(owner);
        vm.expectRevert(ContractRecoveryHub.TransferFailed.selector);
        hub.withdrawRevenue(payable(address(rejectingContract)));
    }

    // 17. Querying Non-Existent Scan
    function test_GetScanRequest_NonExistent() public view {
        (
            address reqUser,
            ContractRecoveryHub.ScanType sType,
            uint256 amt,
            uint256 time,
            bool exists
        ) = hub.getScanRequest(keccak256("nonexistent"));

        assertEq(reqUser, address(0));
        assertTrue(sType == ContractRecoveryHub.ScanType.Free);
        assertEq(amt, 0);
        assertEq(time, 0);
        assertFalse(exists);
    }

    // 18. Fuzz Testing Deep Scan Payments
    function testFuzz_DeepScan_ExactPrice(uint96 price) public {
        vm.assume(price > 0 && price < 1000 ether);

        vm.prank(owner);
        hub.setDeepScanPrice(price);

        address fuzzUser = makeAddr("fuzzUser");
        vm.deal(fuzzUser, price);

        vm.prank(fuzzUser);
        bytes32 scanId = hub.requestDeepScan{value: price}();

        (, , uint256 amt, , bool exists) = hub.getScanRequest(scanId);
        assertEq(amt, price);
        assertTrue(exists);
    }
}
