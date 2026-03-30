// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Auto-generated from src/FSFileRegistry.sol — DO NOT EDIT (regenerate with the script only)

import "./IWorldID.sol";
import "./IFSManager.sol";

interface IFSFileRegistry {
    function worldId() external view returns (address);
    function signDocExternalNullifier() external view returns (uint256);
    struct FileRegistration {
        bytes32 cidIdentifier;
        address sender;
        bytes20 signersCommitment;
        mapping(address => bool) signers;
        uint8 signersCount;
        uint8 signaturesCount;
        mapping(address => bytes) signatures;
        uint256 timestamp;
        mapping(address => address) incentiveToken;
        mapping(address => uint256) incentiveAmount;
        mapping(address => bool) incentiveClaimed;
    }

    struct FileRegistrationView {
        bytes32 cidIdentifier;
        address sender;
        bytes20 signersCommitment;
        uint8 signersCount;
        uint8 signaturesCount;
        uint256 timestamp;
    }

    event FileRegistered();
    event FileSigned();
    function nonce(address key) external view returns (uint256);
    function manager() external view returns (address);
    function initializeWorldId(IWorldID _worldId, string memory _appId, string memory _signActionId) external;
    function computeSignersCommitment(address[] calldata signers_) external pure returns (bytes20);
    function fileRegistrations(bytes32 cidId) external view returns (FileRegistrationView memory);
    function registerFile(string calldata pieceCid_, address sender_, address[] calldata signers_, uint256 timestamp_, bytes calldata signature_) external;
    function registerFileSignatureWorldId(string calldata pieceCid_, address sender_, address signer_, bytes20 dl3SignatureCommitment_, uint256 root_, uint256 nullifierHash_, uint256[8] calldata proof_, uint256 timestamp_, bytes calldata signature_, address[] calldata allSigners_) external;
    function isSigner(bytes32 cidId, address who) external view returns (bool);
    function hasSigned(bytes32 cidId, address who) external view returns (bool);
    function validateFileRegistrationSignature(string calldata pieceCid_, address sender_, address[] calldata signers_, uint256 timestamp_, bytes calldata signature_) external view returns (bool);
    function validateFileSigningSignature(string calldata pieceCid_, address sender_, address signer_, bytes20 dl3SignatureCommitment_, uint256 timestamp_, bytes calldata signature_) external view returns (bool);
    function validateFileAckSignature(string calldata pieceCid_, address sender_, address viewer_, uint256 timestamp_, bytes calldata signature_) external view returns (bool);
    function cidIdentifier(string calldata pieceCid_) external pure returns (bytes32);
    function setSignerIncentive(bytes32 cidId, address signer, address token, uint256 amount) external;
    function getSignerIncentive(bytes32 cidId, address signer) external view returns (address token, uint256 amount, bool claimed);
    function markIncentiveClaimed(bytes32 cidId, address signer) external;
    function allSigned(bytes32 cidId) external view returns (bool);
}
