// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./errors/EFSFileRegistry.sol";
import "./errors/EFSCommon.sol";
import "./interfaces/IFSManager.sol";
import "./interfaces/IFSWorldVerifier.sol";
import "./interfaces/IWorldID.sol";

contract FSFileRegistry is EIP712 {
    using ECDSA for bytes32;

    IWorldID public worldId;
    uint256 public signDocExternalNullifier;

    uint256 constant SIGNATURE_VALIDITY_PERIOD = 2 minutes;
    uint256 constant SIGNATURE_MAX_DRIFT_PERIOD = 1 minutes;

    struct FileRegistration {
        bytes32 cidIdentifier;
        address sender;
        bytes20 signersCommitment;
        mapping(address => bool) signers;
        uint8 signersCount;
        uint8 signaturesCount;
        mapping(address => bytes) signatures;
        uint256 timestamp;
        // per-signer incentives set by the sender before all signers have signed
        mapping(address signer => address) incentiveToken;
        mapping(address signer => uint256) incentiveAmount;
        mapping(address signer => bool) incentiveClaimed;
    }

    struct FileRegistrationView {
        bytes32 cidIdentifier;
        address sender;
        bytes20 signersCommitment;
        uint8 signersCount;
        uint8 signaturesCount;
        uint256 timestamp;
    }

    event FileRegistered(
        bytes32 indexed cidIdentifier,
        address indexed sender,
        uint48 timestamp
    );
    event FileSigned(
        bytes32 indexed cidIdentifier,
        address indexed sender,
        address indexed signer,
        uint48 timestamp
    );

    mapping(address => uint256) public nonce;
    mapping(bytes32 => FileRegistration) private _fileRegistrations;

    IFSManager public immutable manager;

    modifier onlyServer() {
        if (msg.sender != manager.server()) revert OnlyServer();
        _;
    }

    modifier onlyManager() {
        if (msg.sender != address(manager)) revert OnlyManager();
        _;
    }

    constructor() EIP712("FSFileRegistry", "1") {
        manager = IFSManager(msg.sender); // expect msg.sender to be fsmanager
    }

    function initializeWorldId(
        IWorldID _worldId,
        string memory _appId,
        string memory _signActionId
    ) external onlyServer {
        worldId = _worldId;
        uint256 appIdHash = uint256(keccak256(abi.encodePacked(_appId))) >> 8;
        signDocExternalNullifier =
            uint256(keccak256(abi.encodePacked(appIdHash, _signActionId))) >>
            8;
    }

    bytes32 private constant REGISTER_FILE_TYPEHASH =
        keccak256(
            "RegisterFile(bytes32 cidIdentifier,address sender,bytes20 signersCommitment,uint256 timestamp,uint256 nonce)"
        );
    bytes32 private constant ACK_FILE_TYPEHASH =
        keccak256(
            "AckFile(bytes32 cidIdentifier,address sender,address viewer,uint256 timestamp)"
        );
    bytes32 private constant SIGN_FILE_TYPEHASH =
        keccak256(
            "SignFile(bytes32 cidIdentifier,address sender,address signer,bytes20 dl3SignatureCommitment,uint256 timestamp,uint256 nonce)"
        );

    function computeSignersCommitment(
        address[] calldata signers_ // Always expect inpu to be sorted to maintain unifrom output
    ) public pure returns (bytes20) {
        for (uint256 i = 0; i < signers_.length; ) {
            address s = signers_[i];
            if (s == address(0)) revert ZeroSigner();
            if (i > 0) {
                if (s <= signers_[i - 1]) revert UnsortedSigners(); // also catches dup
            }
            unchecked {
                ++i;
            }
        }

        bytes20 commitment = ripemd160(abi.encodePacked(signers_));
        return commitment;
    }

    function fileRegistrations(
        bytes32 cidId
    ) external view returns (FileRegistrationView memory) {
        FileRegistration storage file = _fileRegistrations[cidId];
        return
            FileRegistrationView({
                cidIdentifier: file.cidIdentifier,
                sender: file.sender,
                signersCommitment: file.signersCommitment,
                signersCount: file.signersCount,
                signaturesCount: file.signaturesCount,
                timestamp: file.timestamp
            });
    }

    function registerFile(
        string calldata pieceCid_,
        address sender_,
        address[] calldata signers_,
        uint256 timestamp_,
        bytes calldata signature_
    ) external onlyServer {
        require(
            validateFileRegistrationSignature(
                pieceCid_,
                sender_,
                signers_,
                timestamp_,
                signature_
            ),
            InvalidSignature()
        );
        require(
            (signers_.length > 0 && signers_.length <= type(uint8).max),
            BadSignersLength()
        );

        bytes32 cidId = cidIdentifier(pieceCid_);
        FileRegistration storage file = _fileRegistrations[cidId];
        if (file.timestamp != 0) revert FileAlreadyRegistered();

        file.cidIdentifier = cidId;
        file.sender = sender_;
        file.signersCommitment = computeSignersCommitment(signers_);
        file.signersCount = uint8(signers_.length);
        file.timestamp = timestamp_;

        for (uint256 i = 0; i < signers_.length; i++) {
            file.signers[signers_[i]] = true;
        }

        nonce[sender_]++;
        emit FileRegistered(cidId, sender_, uint48(timestamp_));
    }

    // LEGACY: signing flow without world id
    // function registerFileSignature(
    //     string calldata pieceCid_,
    //     address sender_,
    //     address signer_,
    //     bytes20 dl3SignatureCommitment_,
    //     uint256 timestamp_,
    //     bytes calldata signature_
    // ) external onlyServer {
    //     require(
    //         validateFileSigningSignature(
    //             pieceCid_,
    //             sender_,
    //             signer_,
    //             dl3SignatureCommitment_,
    //             timestamp_,
    //             signature_
    //         ),
    //         InvalidSignature()
    //     );

    //     bytes32 cidId = cidIdentifier(pieceCid_);
    //     FileRegistration storage file = _fileRegistrations[cidId];
    //     if (file.timestamp == 0) revert FileNotRegistered();
    //     if (file.signatures[signer_].length != 0) revert AlreadySigned();
    //     file.signatures[signer_] = signature_;

    //     nonce[signer_]++;
    //     emit FileSigned(cidId, sender_, signer_, uint48(timestamp_));
    // }

    // NEW: signing flow with world id verification
    function registerFileSignatureWorldId(
        string calldata pieceCid_,
        address sender_,
        address signer_,
        bytes20 dl3SignatureCommitment_,
        uint256 root_,
        uint256 nullifierHash_,
        uint256[8] calldata proof_,
        uint256 timestamp_,
        bytes calldata signature_,
        address[] calldata allSigners_ // full list of signers on each sign (high gas but high reliability)
    ) external onlyServer {
        bytes32 cidId = cidIdentifier(pieceCid_);
        FileRegistration storage file = _fileRegistrations[cidId];

        if (file.timestamp == 0) revert FileNotRegistered();
        if (file.signatures[signer_].length != 0) revert AlreadySigned();

        require(
            validateFileSigningSignature(
                pieceCid_,
                sender_,
                signer_,
                dl3SignatureCommitment_,
                timestamp_,
                signature_
            ),
            InvalidSignature()
        );

        // world id check
        address linkedWallet = IFSWorldVerifier(manager.worldVerifier())
            .nullifierToAddress(nullifierHash_);
        require(linkedWallet == signer_, "Not the designated recipient");

        // IDKit signal is sent as `${lowercaseAddress}:${pieceCid}`.
        string memory signerSignal = string.concat(
            Strings.toHexString(uint160(signer_), 20),
            ":",
            pieceCid_
        );
        uint256 signalHash = uint256(
            keccak256(abi.encodePacked(signerSignal))
        ) >> 8;

        worldId.verifyProof(
            root_,
            1,
            signalHash,
            nullifierHash_,
            signDocExternalNullifier,
            proof_
        );

        file.signatures[signer_] = signature_;
        file.signaturesCount++;

        if (file.signaturesCount == file.signersCount) {
            if (allSigners_.length != uint256(file.signersCount))
                revert BadSignersLength();
            if (computeSignersCommitment(allSigners_) != file.signersCommitment)
                revert InvalidSignersCommitment();
            manager.releaseIncentives(pieceCid_, allSigners_);
        }

        nonce[signer_]++;
        emit FileSigned(cidId, sender_, signer_, uint48(block.timestamp));
    }

    function isSigner(bytes32 cidId, address who) external view returns (bool) {
        return _fileRegistrations[cidId].signers[who];
    }

    function hasSigned(
        bytes32 cidId,
        address who
    ) external view returns (bool) {
        return _fileRegistrations[cidId].signatures[who].length != 0;
    }

    function validateFileRegistrationSignature(
        string calldata pieceCid_,
        address sender_,
        address[] calldata signers_,
        uint256 timestamp_,
        bytes calldata signature_
    ) public view returns (bool) {
        require(
            block.timestamp <= timestamp_ + SIGNATURE_VALIDITY_PERIOD,
            SignatureExpired()
        );

        if (!manager.isRegistered(sender_)) revert SenderNotRegistered();
        for (uint256 i = 0; i < signers_.length; i++) {
            if (!manager.approvedSenders(signers_[i], sender_))
                revert SignerNotApproved(signers_[i], sender_);
        }

        bytes20 signersCommitment = computeSignersCommitment(signers_);

        bytes32 cidId = cidIdentifier(pieceCid_);
        bytes32 structHash = keccak256(
            abi.encode(
                REGISTER_FILE_TYPEHASH,
                cidId,
                sender_,
                signersCommitment,
                timestamp_,
                nonce[sender_]
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature_);
        return recovered == sender_;
    }

    function validateFileSigningSignature(
        string calldata pieceCid_,
        address sender_,
        address signer_,
        bytes20 dl3SignatureCommitment_,
        uint256 timestamp_,
        bytes calldata signature_
    ) public view returns (bool) {
        require(
            block.timestamp <= timestamp_ + SIGNATURE_VALIDITY_PERIOD,
            SignatureExpired()
        );

        FileRegistration storage file = _fileRegistrations[
            cidIdentifier(pieceCid_)
        ];
        if (!file.signers[signer_]) revert InvalidSigner();
        if (file.sender != sender_) revert InvalidSender();

        bytes32 cidId = cidIdentifier(pieceCid_);
        bytes32 structHash = keccak256(
            abi.encode(
                SIGN_FILE_TYPEHASH,
                cidId,
                sender_,
                signer_,
                dl3SignatureCommitment_,
                timestamp_,
                nonce[signer_]
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature_);
        return recovered == signer_;
    }

    function validateFileAckSignature(
        string calldata pieceCid_,
        address sender_,
        address viewer_,
        uint256 timestamp_,
        bytes calldata signature_
    ) public view returns (bool) {
        require(
            block.timestamp <= timestamp_ + SIGNATURE_VALIDITY_PERIOD,
            SignatureExpired()
        );
        FileRegistration storage file = _fileRegistrations[
            cidIdentifier(pieceCid_)
        ];
        if (!file.signers[viewer_]) revert InvalidSigner();
        if (file.sender != sender_) revert InvalidSender();

        bytes32 cidId = cidIdentifier(pieceCid_);
        bytes32 structHash = keccak256(
            abi.encode(ACK_FILE_TYPEHASH, cidId, sender_, viewer_, timestamp_)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature_);
        return recovered == viewer_;
    }

    function cidIdentifier(
        string calldata pieceCid_
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(pieceCid_));
    }

    // -------------------------------------------------------------------------
    // Incentive management — called by FSManager only
    // -------------------------------------------------------------------------

    /// @notice Record a per-signer token incentive for a file. Tokens are held
    ///         in the escrow; this only stores the accounting entry.
    function setSignerIncentive(
        bytes32 cidId,
        address signer,
        address token,
        uint256 amount
    ) external onlyManager {
        FileRegistration storage file = _fileRegistrations[cidId];
        if (file.timestamp == 0) revert FileNotRegistered();
        if (file.signaturesCount == file.signersCount)
            revert FileAlreadyFullySigned();
        if (!file.signers[signer]) revert InvalidSigner();
        if (file.incentiveToken[signer] != address(0))
            revert IncentiveAlreadyAttached();
        file.incentiveToken[signer] = token;
        file.incentiveAmount[signer] = amount;
    }

    /// @notice Read the incentive assigned to a signer for a file.
    function getSignerIncentive(
        bytes32 cidId,
        address signer
    ) external view returns (address token, uint256 amount, bool claimed) {
        FileRegistration storage file = _fileRegistrations[cidId];
        return (
            file.incentiveToken[signer],
            file.incentiveAmount[signer],
            file.incentiveClaimed[signer]
        );
    }

    /// @notice Mark a signer's incentive as claimed. Called by FSManager after releasing
    ///         the tokens from escrow.
    function markIncentiveClaimed(
        bytes32 cidId,
        address signer
    ) external onlyManager {
        _fileRegistrations[cidId].incentiveClaimed[signer] = true;
    }

    /// @notice Returns true once every signer has submitted a valid signature.
    function allSigned(bytes32 cidId) external view returns (bool) {
        FileRegistration storage file = _fileRegistrations[cidId];
        return file.timestamp != 0 && file.signaturesCount == file.signersCount;
    }
}
