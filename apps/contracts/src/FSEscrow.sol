// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./errors/EFSEscrow.sol";

contract FSEscrow {
    using SafeERC20 for IERC20;
    address public immutable manager;

    mapping(address account => mapping(address token => uint256 amount))
        public balances;

    event Deposited(
        address indexed token,
        address indexed account,
        uint256 amount
    );
    event Released(
        address indexed token,
        address indexed account,
        address indexed recipient,
        uint256 amount
    );

    modifier onlyManager() {
        if (msg.sender != manager) revert OnlyManager();
        _;
    }

    constructor() {
        manager = msg.sender;
    }

    function depositWithPermit(
        address token,
        address account,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external onlyManager {
        if (token == address(0) || account == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        IERC20Permit(token).permit(
            account,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );

        IERC20(token).safeTransferFrom(account, address(this), amount);
        balances[account][token] += amount;

        emit Deposited(token, account, amount);
    }

    function deposit(
        address token,
        address account,
        uint256 amount
    ) external onlyManager {
        if (token == address(0) || account == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        IERC20(token).safeTransferFrom(account, address(this), amount);
        balances[account][token] += amount;

        emit Deposited(token, account, amount);
    }

    function release(
        address token,
        address account,
        uint256 amount,
        address recipient
    ) external onlyManager {
        if (
            token == address(0) ||
            account == address(0) ||
            recipient == address(0)
        ) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 available = balances[account][token];
        if (available < amount) revert InsufficientBalance();

        balances[account][token] = available - amount;
        IERC20(token).safeTransfer(recipient, amount);

        emit Released(token, account, recipient, amount);
    }
}
