// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ContractRecoveryHub
 * @author ReclaimX
 * @notice On-chain registry and payment hub for ReclaimX smart contract discovery on BOT Chain.
 * @dev Non-custodial: does NOT custody recovered funds or execute arbitrary calls.
 */
contract ContractRecoveryHub is Ownable2Step, Pausable, ReentrancyGuard {
    enum ScanType {
        Free,
        Deep
    }

    struct ScanRequest {
        address user;
        ScanType scanType;
        uint256 amountPaid;
        uint256 timestamp;
        bool exists;
    }

    // --- State Variables ---

    uint256 public deepScanPrice;
    uint256 public scanNonce;

    mapping(bytes32 => ScanRequest) private _scanRequests;
    mapping(address => bytes32[]) private _userScanIds;

    // --- Events ---

    event ScanRequested(
        bytes32 indexed scanId,
        address indexed user,
        ScanType indexed scanType,
        uint256 amountPaid,
        uint256 timestamp
    );

    event DeepScanPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event RevenueWithdrawn(address indexed recipient, uint256 amount);

    // --- Errors ---

    error InvalidPayment(uint256 sent, uint256 expected);
    error InvalidRecipient();
    error NoRevenueToWithdraw();
    error TransferFailed();
    error ScanNotFound(bytes32 scanId);

    // --- Constructor ---

    constructor(
        address initialOwner,
        uint256 initialDeepScanPrice
    ) Ownable(initialOwner) {
        deepScanPrice = initialDeepScanPrice;
    }

    // --- Scan Registration ---

    /**
     * @notice Registers a free discovery scan. User pays network gas only.
     * @return scanId Unique on-chain scan identifier.
     */
    function requestFreeScan() external whenNotPaused returns (bytes32 scanId) {
        scanId = _generateScanId(ScanType.Free);

        _scanRequests[scanId] = ScanRequest({
            user: msg.sender,
            scanType: ScanType.Free,
            amountPaid: 0,
            timestamp: block.timestamp,
            exists: true
        });

        _userScanIds[msg.sender].push(scanId);

        emit ScanRequested(scanId, msg.sender, ScanType.Free, 0, block.timestamp);
    }

    /**
     * @notice Registers a paid deep scan. Requires exact deepScanPrice payment.
     * @return scanId Unique on-chain scan identifier.
     */
    function requestDeepScan()
        external
        payable
        whenNotPaused
        nonReentrant
        returns (bytes32 scanId)
    {
        if (msg.value != deepScanPrice) {
            revert InvalidPayment(msg.value, deepScanPrice);
        }

        scanId = _generateScanId(ScanType.Deep);

        _scanRequests[scanId] = ScanRequest({
            user: msg.sender,
            scanType: ScanType.Deep,
            amountPaid: msg.value,
            timestamp: block.timestamp,
            exists: true
        });

        _userScanIds[msg.sender].push(scanId);

        emit ScanRequested(
            scanId,
            msg.sender,
            ScanType.Deep,
            msg.value,
            block.timestamp
        );
    }

    // --- Views ---

    /**
     * @notice Reads a registered scan request.
     * @param scanId The unique scan identifier.
     */
    function getScanRequest(
        bytes32 scanId
    )
        external
        view
        returns (
            address user,
            ScanType scanType,
            uint256 amountPaid,
            uint256 timestamp,
            bool exists
        )
    {
        ScanRequest memory request = _scanRequests[scanId];
        return (
            request.user,
            request.scanType,
            request.amountPaid,
            request.timestamp,
            request.exists
        );
    }

    /**
     * @notice Returns all scan IDs registered by a specific user.
     */
    function getUserScanIds(
        address user
    ) external view returns (bytes32[] memory) {
        return _userScanIds[user];
    }

    // --- Admin Functions ---

    /**
     * @notice Updates the price for paid deep scans.
     * @param newPrice The new price in native BOT wei.
     */
    function setDeepScanPrice(uint256 newPrice) external onlyOwner {
        uint256 oldPrice = deepScanPrice;
        deepScanPrice = newPrice;
        emit DeepScanPriceUpdated(oldPrice, newPrice);
    }

    /**
     * @notice Withdraws accumulated platform revenue to specified recipient.
     * @param recipient The destination address for native BOT.
     */
    function withdrawRevenue(
        address payable recipient
    ) external onlyOwner nonReentrant {
        if (recipient == address(0)) {
            revert InvalidRecipient();
        }

        uint256 balance = address(this).balance;
        if (balance == 0) {
            revert NoRevenueToWithdraw();
        }

        (bool success, ) = recipient.call{value: balance}("");
        if (!success) {
            revert TransferFailed();
        }

        emit RevenueWithdrawn(recipient, balance);
    }

    /**
     * @notice Emergency circuit breaker - pauses scan registrations.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Resumes scan registrations.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // --- Internal Helpers ---

    function _generateScanId(ScanType scanType) internal returns (bytes32) {
        unchecked {
            scanNonce++;
        }
        return
            keccak256(
                abi.encodePacked(
                    block.chainid,
                    address(this),
                    msg.sender,
                    uint8(scanType),
                    scanNonce,
                    block.timestamp,
                    block.prevrandao
                )
            );
    }
}
