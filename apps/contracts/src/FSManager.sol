// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

import "./FSFileRegistry.sol";
import "./FSKeyRegistry.sol";
import "./FSEscrow.sol";
import "./errors/EFSFileRegistry.sol";
import "./errors/EFSManager.sol";

contract FSManager is EIP712 {
    using ECDSA for bytes32;

    address public cidRegistry;
    address public fileRegistry;
    address public keyRegistry;
    address public escrow;

    address public immutable server;

    uint8 public version = 1;

    mapping(address => mapping(address => bool)) public approvedSenders; // recipeint => sender => aproved
    mapping(address => uint256) public approveNonce;

    bytes32 private constant APPROVE_SENDER_TYPEHASH =
        keccak256(
            "ApproveSender(address recipient,address sender,uint256 nonce,uint256 deadline)"
        );

    event SenderApproved(address indexed recipient, address indexed sender);
    event SenderRevoked(address indexed recipient, address indexed sender);
    event IncentiveAttached(
        bytes32 indexed cidId,
        bytes32 indexed signerEmailCommitment,
        address token,
        uint256 amount,
        bytes32 memoHash
    );
    event IncentivesReleased(bytes32 indexed cidId);
    event IncentiveRefunded(
        bytes32 indexed cidId,
        bytes32 indexed signerEmailCommitment,
        address token,
        uint256 amount
    );

    modifier onlyServer() {
        if (msg.sender != server) revert OnlyServer();
        _;
    }

    modifier onlyServerOrFileRegistry() {
        if (msg.sender != server && msg.sender != fileRegistry)
            revert OnlyServerOrFileRegistry();
        _;
    }

    constructor() EIP712("FSManager", "1") {
        server = msg.sender;
        fileRegistry = address(new FSFileRegistry());
        keyRegistry = address(new FSKeyRegistry());
        escrow = address(new FSEscrow());
    }

    function setActiveVersion(uint8 version_) external onlyServer {
        version = version_;
    }

    function isRegistered(address account_) public view returns (bool) {
        return FSKeyRegistry(keyRegistry).isRegistered(account_);
    }

    function approveSender(
        address recipient_,
        address sender_,
        uint256 nonce_,
        uint256 deadline_,
        bytes calldata signature_
    ) external onlyServer {
        if (block.timestamp > deadline_) revert ApproveSignatureExpired();
        if (nonce_ != approveNonce[recipient_]) revert InvalidApproveNonce();

        if (!isRegistered(sender_)) revert SenderNotRegistered();
        if (approvedSenders[recipient_][sender_])
            revert SenderAlreadyApproved();
        if (recipient_ == sender_) revert CannotApproveSelf();

        if (
            !validateApproveSenderSignature(
                recipient_,
                sender_,
                nonce_,
                deadline_,
                signature_
            )
        ) revert InvalidApproveSignature();

        // consume nonce
        approveNonce[recipient_] = nonce_ + 1;

        approvedSenders[recipient_][sender_] = true;
        emit SenderApproved(recipient_, sender_);
    }

    function validateApproveSenderSignature(
        address recipient_,
        address sender_,
        uint256 nonce_,
        uint256 deadline_,
        bytes calldata signature_
    ) public view returns (bool) {
        bytes32 structHash = keccak256(
            abi.encode(
                APPROVE_SENDER_TYPEHASH,
                recipient_,
                sender_,
                nonce_,
                deadline_
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature_);
        return recovered == recipient_;
    }

    function revokeSender(address sender_) external {
        if (!approvedSenders[msg.sender][sender_]) revert SenderNotApproved();
        approvedSenders[msg.sender][sender_] = false;
        emit SenderRevoked(msg.sender, sender_);
    }

    function escrowSetSenderBlacklisted(
        address account_,
        bool blacklisted_
    ) external onlyServer {
        FSEscrow(escrow).setSenderBlacklisted(account_, blacklisted_);
    }

    function escrowSetDefaultMaxDepositPerTx(uint256 max_) external onlyServer {
        FSEscrow(escrow).setDefaultMaxDepositPerTx(max_);
    }

    function escrowSetMaxDepositOverride(
        address sender_,
        address token_,
        uint256 maxAmount_
    ) external onlyServer {
        FSEscrow(escrow).setMaxDepositOverride(sender_, token_, maxAmount_);
    }

    function attachIncentive(
        string calldata pieceCid_,
        bytes32 signerEmailCommitment_,
        address token_,
        uint256 amount_,
        bytes32 memoHash_
    ) external onlyServer {
        bytes32 cidId = FSFileRegistry(fileRegistry).cidIdentifier(pieceCid_);
        address sender = FSFileRegistry(fileRegistry)
            .fileRegistrations(cidId)
            .sender;

        FSFileRegistry(fileRegistry).setSignerIncentive(
            cidId,
            signerEmailCommitment_,
            token_,
            amount_,
            memoHash_
        );
        FSEscrow(escrow).deposit(token_, sender, amount_);
        emit IncentiveAttached(
            cidId,
            signerEmailCommitment_,
            token_,
            amount_,
            memoHash_
        );
    }

    function attachIncentiveWithPermit(
        string calldata pieceCid_,
        bytes32 signerEmailCommitment_,
        address token_,
        uint256 amount_,
        bytes32 memoHash_,
        uint256 deadline_,
        uint8 v_,
        bytes32 r_,
        bytes32 s_
    ) external onlyServer {
        bytes32 cidId = FSFileRegistry(fileRegistry).cidIdentifier(pieceCid_);
        address sender = FSFileRegistry(fileRegistry)
            .fileRegistrations(cidId)
            .sender;
        FSFileRegistry(fileRegistry).setSignerIncentive(
            cidId,
            signerEmailCommitment_,
            token_,
            amount_,
            memoHash_
        );
        FSEscrow(escrow).depositWithPermit(
            token_,
            sender,
            amount_,
            deadline_,
            v_,
            r_,
            s_
        );
        emit IncentiveAttached(
            cidId,
            signerEmailCommitment_,
            token_,
            amount_,
            memoHash_
        );
    }

    function refundSignerIncentive(
        string calldata pieceCid_,
        bytes32 signerEmailCommitment_
    ) external onlyServer {
        bytes32 cidId = FSFileRegistry(fileRegistry).cidIdentifier(pieceCid_);
        if (FSFileRegistry(fileRegistry).allSigned(cidId))
            revert FileAlreadyFullySigned();
        if (FSFileRegistry(fileRegistry).hasSigned(cidId, signerEmailCommitment_))
            revert IncentiveRefundSignerAlreadySigned();

        (address token, uint256 amount, bool claimed) = FSFileRegistry(
            fileRegistry
        ).getSignerIncentive(cidId, signerEmailCommitment_);
        if (token == address(0) || amount == 0) revert IncentiveNotAttached();
        if (claimed) revert IncentiveAlreadyClaimed();

        uint256 unlockTime = FSFileRegistry(fileRegistry).getIncentiveRefundNotBefore(
            cidId,
            signerEmailCommitment_
        );
        if (unlockTime == 0) revert IncentiveNotAttached();
        if (block.timestamp < unlockTime) revert IncentiveRefundTooEarly();

        address sender = FSFileRegistry(fileRegistry)
            .fileRegistrations(cidId)
            .sender;

        FSFileRegistry(fileRegistry).clearSignerIncentive(
            cidId,
            signerEmailCommitment_
        );
        FSEscrow(escrow).release(token, sender, amount, sender);
        emit IncentiveRefunded(cidId, signerEmailCommitment_, token, amount);
    }

    function releaseIncentives(
        string calldata pieceCid_,
        bytes32[] calldata signerEmailCommitments_,
        address[] calldata payoutWallets_
    ) external onlyServerOrFileRegistry {
        bytes32 cidId = FSFileRegistry(fileRegistry).cidIdentifier(pieceCid_);
        require(FSFileRegistry(fileRegistry).allSigned(cidId), NotAllSigned());
        if (signerEmailCommitments_.length != payoutWallets_.length)
            revert IncentiveReleaseLengthMismatch();

        address sender = FSFileRegistry(fileRegistry)
            .fileRegistrations(cidId)
            .sender;

        for (uint256 i = 0; i < signerEmailCommitments_.length; ) {
            bytes32 commitment = signerEmailCommitments_[i];
            address payout = payoutWallets_[i];
            (address token, uint256 amount, bool claimed) = FSFileRegistry(
                fileRegistry
            ).getSignerIncentive(cidId, commitment);

            if (amount > 0) {
                if (claimed) revert IncentiveAlreadyClaimed();
                FSFileRegistry(fileRegistry).markIncentiveClaimed(
                    cidId,
                    commitment
                );
                FSEscrow(escrow).release(token, sender, amount, payout);
            }

            unchecked {
                ++i;
            }
        }

        emit IncentivesReleased(cidId);
    }
}
