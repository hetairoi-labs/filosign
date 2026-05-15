// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "./errors/EFSEscrow.sol";

/// @title FSEscrow
/// @notice ERC20 vault for signer incentives. Only FSManager may move funds.
contract FSEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable manager;

    mapping(address account => mapping(address token => uint256 amount))
        public balances;

    mapping(address token => uint256) public totalLiabilities;
    mapping(address token => uint256) public platformRevenue;

    mapping(address token => bool) public allowedToken;

    mapping(address account => bool) public senderDepositBlacklisted;
    mapping(address account => bool) public payoutBlacklisted;

    mapping(address sender => mapping(address token => uint256 maxAmount))
        public maxDepositOverride;

    uint256 public defaultMaxDepositPerTx;

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
    event PlatformFeeAccrued(
        address indexed token,
        address indexed sender,
        uint256 fee
    );
    event PlatformRevenueWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );
    event StrayTokenSwept(
        address indexed token,
        address indexed to,
        uint256 amount
    );
    event TokenAllowedUpdated(address indexed token, bool allowed);

    modifier onlyManager() {
        if (msg.sender != manager) revert OnlyManager();
        _;
    }

    constructor() {
        manager = msg.sender;
        defaultMaxDepositPerTx = type(uint256).max;
    }

    function setAllowedToken(address token_, bool allowed_) external onlyManager {
        if (token_ == address(0)) revert ZeroAddress();
        allowedToken[token_] = allowed_;
        emit TokenAllowedUpdated(token_, allowed_);
    }

    function setSenderDepositBlacklisted(
        address account_,
        bool blacklisted_
    ) external onlyManager {
        if (account_ == address(0)) revert ZeroAddress();
        senderDepositBlacklisted[account_] = blacklisted_;
    }

    function setPayoutBlacklisted(
        address account_,
        bool blacklisted_
    ) external onlyManager {
        if (account_ == address(0)) revert ZeroAddress();
        payoutBlacklisted[account_] = blacklisted_;
    }

    function setDefaultMaxDepositPerTx(uint256 max_) external onlyManager {
        defaultMaxDepositPerTx = max_;
    }

    function setMaxDepositOverride(
        address sender_,
        address token_,
        uint256 maxAmount_
    ) external onlyManager {
        if (sender_ == address(0) || token_ == address(0)) revert ZeroAddress();
        maxDepositOverride[sender_][token_] = maxAmount_;
    }

    /// @notice Sum of escrow liabilities and platform revenue for `token`.
    function accountedAssets(address token) public view returns (uint256) {
        return totalLiabilities[token] + platformRevenue[token];
    }

    /// @notice ERC20 balance not tracked in the ledger (mistaken transfers).
    function strayBalance(address token) public view returns (uint256) {
        uint256 balance = IERC20(token).balanceOf(address(this));
        uint256 accounted = accountedAssets(token);
        return balance > accounted ? balance - accounted : 0;
    }

    function _requireAllowedToken(address token) internal view {
        if (!allowedToken[token]) revert TokenNotSupported();
    }

    function _enforceDepositRules(
        address token,
        address account,
        uint256 amount
    ) internal view {
        if (senderDepositBlacklisted[account]) revert SenderDepositBlacklisted();
        uint256 cap = maxDepositOverride[account][token];
        if (cap == 0) {
            cap = defaultMaxDepositPerTx;
        }
        if (cap != type(uint256).max && amount > cap) revert ExceedsMaxDeposit();
    }

    function _creditDeposit(
        address token,
        address account,
        uint256 amount
    ) internal {
        balances[account][token] += amount;
        totalLiabilities[token] += amount;
        emit Deposited(token, account, amount);
    }

    function depositWithPermit(
        address token,
        address account,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external onlyManager nonReentrant {
        if (token == address(0) || account == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        _requireAllowedToken(token);
        _enforceDepositRules(token, account, amount);

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
        _creditDeposit(token, account, amount);
    }

    function deposit(
        address token,
        address account,
        uint256 amount
    ) external onlyManager nonReentrant {
        if (token == address(0) || account == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        _requireAllowedToken(token);
        _enforceDepositRules(token, account, amount);

        IERC20(token).safeTransferFrom(account, address(this), amount);
        _creditDeposit(token, account, amount);
    }

    /// @notice Full release to recipient (refunds). No platform fee.
    function release(
        address token,
        address account,
        uint256 amount,
        address recipient
    ) external onlyManager nonReentrant {
        _release(token, account, amount, recipient);
    }

    /// @notice Settle incentive: debit gross from sender, pay net to payout, accrue fee.
    function settleIncentiveRelease(
        address token,
        address account,
        address payout,
        uint256 gross,
        uint16 feeBps
    ) external onlyManager nonReentrant returns (uint256 fee) {
        if (payoutBlacklisted[payout]) revert PayoutBlacklisted();
        fee = Math.mulDiv(gross, feeBps, 10_000);
        uint256 net = gross - fee;

        _debitAccount(token, account, gross);

        if (net > 0) {
            IERC20(token).safeTransfer(payout, net);
            emit Released(token, account, payout, net);
        }

        if (fee > 0) {
            platformRevenue[token] += fee;
            emit PlatformFeeAccrued(token, account, fee);
        }
    }

    function withdrawPlatformRevenue(
        address token,
        address to,
        uint256 amount
    ) external onlyManager nonReentrant {
        if (token == address(0) || to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        _requireAllowedToken(token);
        if (platformRevenue[token] < amount) revert InsufficientBalance();

        platformRevenue[token] -= amount;
        IERC20(token).safeTransfer(to, amount);
        emit PlatformRevenueWithdrawn(token, to, amount);
    }

    function sweepStrayToken(
        address token,
        address to,
        uint256 amount
    ) external onlyManager nonReentrant {
        if (token == address(0) || to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        uint256 stray = strayBalance(token);
        if (amount > stray) revert ExceedsStrayBalance();

        IERC20(token).safeTransfer(to, amount);
        emit StrayTokenSwept(token, to, amount);
    }

    function _release(
        address token,
        address account,
        uint256 amount,
        address recipient
    ) internal {
        if (
            token == address(0) ||
            account == address(0) ||
            recipient == address(0)
        ) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        _requireAllowedToken(token);
        if (payoutBlacklisted[recipient]) revert PayoutBlacklisted();

        _debitAccount(token, account, amount);
        IERC20(token).safeTransfer(recipient, amount);
        emit Released(token, account, recipient, amount);
    }

    function _debitAccount(
        address token,
        address account,
        uint256 amount
    ) internal {
        uint256 available = balances[account][token];
        if (available < amount) revert InsufficientBalance();
        balances[account][token] = available - amount;
        totalLiabilities[token] -= amount;
    }
}
