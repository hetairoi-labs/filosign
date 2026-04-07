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
        address indexed signer,
        address token,
        uint256 amount
    );
    event IncentivesReleased(bytes32 indexed cidId);

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

    function attachIncentive(
        string calldata pieceCid_,
        address signer_,
        address token_,
        uint256 amount_
    ) external onlyServer {
        bytes32 cidId = FSFileRegistry(fileRegistry).cidIdentifier(pieceCid_);
        address sender = FSFileRegistry(fileRegistry)
            .fileRegistrations(cidId)
            .sender;

        FSFileRegistry(fileRegistry).setSignerIncentive(
            cidId,
            signer_,
            token_,
            amount_
        );
        FSEscrow(escrow).deposit(token_, sender, amount_);
        emit IncentiveAttached(cidId, signer_, token_, amount_);
    }

    function attachIncentiveWithPermit(
        string calldata pieceCid_,
        address signer_,
        address token_,
        uint256 amount_,
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
            signer_,
            token_,
            amount_
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
        emit IncentiveAttached(cidId, signer_, token_, amount_);
    }

    function releaseIncentives(
        string calldata pieceCid_,
        address[] calldata signers_
    ) external onlyServerOrFileRegistry {
        bytes32 cidId = FSFileRegistry(fileRegistry).cidIdentifier(pieceCid_);
        require(FSFileRegistry(fileRegistry).allSigned(cidId), NotAllSigned());

        address sender = FSFileRegistry(fileRegistry)
            .fileRegistrations(cidId)
            .sender;

        for (uint256 i = 0; i < signers_.length; ) {
            address signer = signers_[i];
            (address token, uint256 amount, bool claimed) = FSFileRegistry(
                fileRegistry
            ).getSignerIncentive(cidId, signer);

            if (amount > 0) {
                if (claimed) revert IncentiveAlreadyClaimed();
                FSFileRegistry(fileRegistry).markIncentiveClaimed(
                    cidId,
                    signer
                );
                FSEscrow(escrow).release(token, sender, amount, signer);
            }

            unchecked {
                ++i;
            }
        }

        emit IncentivesReleased(cidId);
    }
}
