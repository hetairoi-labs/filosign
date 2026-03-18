// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.26;

import "./FSFileRegistry.sol";
import "./FSKeyRegistry.sol";
import "./errors/EFSManager.sol";

contract FSManager {
    address public cidRegistry;
    address public fileRegistry;
    address public keyRegistry;

    address public immutable server;

    uint8 public version = 1;

    mapping(address => mapping(address => bool)) public approvedSenders; // recipeint => sender => aproved

    event SenderApproved(address indexed recipient, address indexed sender);
    event SenderRevoked(address indexed recipient, address indexed sender);

    modifier onlyServer() {
        if (msg.sender != server) revert OnlyServer();
        _;
    }

    constructor() {
        server = msg.sender;
        fileRegistry = address(new FSFileRegistry());
        keyRegistry = address(new FSKeyRegistry());
    }

    function setActiveVersion(uint8 version_) external onlyServer {
        version = version_;
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
}
