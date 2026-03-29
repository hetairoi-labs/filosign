// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Auto-generated from src/FSManager.sol — DO NOT EDIT (regenerate with the script only)

interface IFSManager {
    function cidRegistry() external view returns (address);
    function fileRegistry() external view returns (address);
    function keyRegistry() external view returns (address);
    function worldVerifier() external view returns (address);
    function escrow() external view returns (address);
    function server() external view returns (address);
    function version() external view returns (uint8);
    function approvedSenders(address key, address key1) external view returns (bool);
    event SenderApproved();
    event SenderRevoked();
    event IncentiveAttached();
    event IncentivesReleased();
    function setActiveVersion(uint8 version_) external;
    function setWorldVerifier(address _worldVerifier) external;
    function isRegistered(address account_) external view returns (bool);
    function approveSender(address sender_) external;
    function revokeSender(address sender_) external;
    function attachIncentive(string calldata pieceCid_, address signer_, address token_, uint256 amount_) external;
    function attachIncentiveWithPermit(string calldata pieceCid_, address signer_, address token_, uint256 amount_, uint256 deadline_, uint8 v_, bytes32 r_, bytes32 s_) external;
    function releaseIncentives(string calldata pieceCid_, address[] calldata signers_) external;
}
