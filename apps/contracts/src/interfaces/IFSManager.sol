// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Auto-generated from src/FSManager.sol — DO NOT EDIT (regenerate with the script only)

interface IFSManager {
    function PAUSE_ATTACH() external view returns (uint8);
    function PAUSE_RELEASE() external view returns (uint8);
    function PAUSE_REFUND() external view returns (uint8);
    function PAUSE_PLATFORM_WITHDRAW() external view returns (uint8);
    function PAUSE_ADMIN() external view returns (uint8);
    function MAX_PLATFORM_FEE_BPS() external view returns (uint16);
    function BPS_DENOMINATOR() external view returns (uint16);
    function fileRegistry() external view returns (address);
    function keyRegistry() external view returns (address);
    function escrow() external view returns (address);
    function server() external view returns (address);
    function treasury() external view returns (address);
    function version() external view returns (uint8);
    function pauseFlags() external view returns (uint8);
    function platformFeeBps() external view returns (uint16);
    function approvedSenders(address key, address key1) external view returns (bool);
    function approveNonce(address key) external view returns (uint256);
    event SenderApproved();
    event SenderRevoked();
    event IncentiveAttached();
    event IncentivesReleased();
    event IncentiveRefunded();
    event PlatformFeeBpsUpdated();
    event PauseFlagsUpdated();
    function isFundOperationPaused(uint8 flag) external view returns (bool);
    function setPauseFlags(uint8 flags_) external;
    function setPlatformFeeBps(uint16 bps_) external;
    function setActiveVersion(uint8 version_) external;
    function isRegistered(address account_) external view returns (bool);
    function approveSender(address recipient_, address sender_, uint256 nonce_, uint256 deadline_, bytes calldata signature_) external;
    function validateApproveSenderSignature(address recipient_, address sender_, uint256 nonce_, uint256 deadline_, bytes calldata signature_) external view returns (bool);
    function revokeSender(address sender_) external;
    function setTokenAllowed(address token_, bool allowed_) external;
    function escrowSetSenderBlacklisted(address account_, bool blacklisted_) external;
    function escrowSetPayoutBlacklisted(address account_, bool blacklisted_) external;
    function escrowSetDefaultMaxDepositPerTx(uint256 max_) external;
    function escrowSetMaxDepositOverride(address sender_, address token_, uint256 maxAmount_) external;
    function withdrawPlatformRevenue(address token_, uint256 amount_) external;
    function sweepStrayToken(address token_, uint256 amount_) external;
    function attachIncentive(string calldata pieceCid_, bytes32 signerEmailCommitment_, address token_, uint256 amount_, bytes32 memoHash_) external;
    function attachIncentiveWithPermit(string calldata pieceCid_, bytes32 signerEmailCommitment_, address token_, uint256 amount_, bytes32 memoHash_, uint256 deadline_, uint8 v_, bytes32 r_, bytes32 s_) external;
    function refundSignerIncentive(string calldata pieceCid_, bytes32 signerEmailCommitment_) external;
    function releaseIncentives(string calldata pieceCid_, bytes32[] calldata signerEmailCommitments_, address[] calldata payoutWallets_) external;
}
