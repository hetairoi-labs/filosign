// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.26;

import "./FSFileRegistry.sol";
import "./FSKeyRegistry.sol";
import "./FSEscrow.sol";
import "./errors/EFSManager.sol";

contract FSManager {
    address public cidRegistry;
    address public fileRegistry;
    address public keyRegistry;
    address public worldVerifier;
    address public escrow;

    address public immutable server;

    uint8 public version = 1;

    mapping(address => mapping(address => bool)) public approvedSenders; // recipeint => sender => aproved

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

    constructor() {
        server = msg.sender;
        fileRegistry = address(new FSFileRegistry());
        keyRegistry = address(new FSKeyRegistry());
        escrow = address(new FSEscrow());
    }

    function setActiveVersion(uint8 version_) external onlyServer {
        version = version_;
    }

    function setWorldVerifier(address _worldVerifier) external onlyServer {
        worldVerifier = _worldVerifier;
    }

    function isRegistered(address account_) public view returns (bool) {
        return FSKeyRegistry(keyRegistry).isRegistered(account_);
    }

    function approveSender(address sender_) external {
        if (!isRegistered(sender_)) revert SenderNotRegistered();
        if (approvedSenders[msg.sender][sender_])
            revert SenderAlreadyApproved();
        if (msg.sender == sender_) revert CannotApproveSelf();
        approvedSenders[msg.sender][sender_] = true;
        emit SenderApproved(msg.sender, sender_);
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
    ) external onlyServer {
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
