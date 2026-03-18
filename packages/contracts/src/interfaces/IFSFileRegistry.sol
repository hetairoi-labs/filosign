// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Auto-generated from src/FSFileRegistry.sol — DO NOT EDIT (regenerate with the script only)

import "./IFSManager.sol";

interface IFSFileRegistry {
    struct FileRegistration {
        bytes32 cidIdentifier;
        address sender;
        mapping(address => bool) signers;
        uint8 signersCount;
        mapping(address => bytes) signatures;
        uint256 timestamp;
    }

    struct FileRegistrationView {
        bytes32 cidIdentifier;
        address sender;
        uint8 signersCount;
        uint256 timestamp;
    }

    event FileRegistered();
    event FileSigned();
    function nonce(address key) external view returns (uint256);
    function manager() external view returns (address);
    function computeSignersCommitment(address[] calldata signers_) external pure returns (bytes20);
    function fileRegistrations(bytes32 cidId) external view returns (FileRegistrationView memory);
    function registerFile(string calldata pieceCid_, address sender_, address[] calldata signers_, uint256 timestamp_, bytes calldata signature_) external;
    function registerFileSignature(string calldata pieceCid_, address sender_, address signer_, bytes20 dl3SignatureCommitment_, uint256 timestamp_, bytes calldata signature_) external;
    function isSigner(bytes32 cidId, address who) external view returns (bool);
    function hasSigned(bytes32 cidId, address who) external view returns (bool);
    function validateFileRegistrationSignature(string calldata pieceCid_, address sender_, address[] calldata signers_, uint256 timestamp_, bytes calldata signature_) external view returns (bool);
    function validateFileSigningSignature(string calldata pieceCid_, address sender_, address signer_, bytes20 dl3SignatureCommitment_, uint256 timestamp_, bytes calldata signature_) external view returns (bool);
    function validateFileAckSignature(string calldata pieceCid_, address sender_, address viewer_, uint256 timestamp_, bytes calldata signature_) external view returns (bool);
    function cidIdentifier(string calldata pieceCid_) external pure returns (bytes32);
}
