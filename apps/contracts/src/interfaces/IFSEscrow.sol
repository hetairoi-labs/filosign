// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Auto-generated from src/FSEscrow.sol — DO NOT EDIT (regenerate with the script only)

interface IFSEscrow {
    function manager() external view returns (address);
    function balances(address key, address key1) external view returns (uint256);
    function totalLiabilities(address key) external view returns (uint256);
    function platformRevenue(address key) external view returns (uint256);
    function allowedToken(address key) external view returns (bool);
    function senderDepositBlacklisted(address key) external view returns (bool);
    function payoutBlacklisted(address key) external view returns (bool);
    function maxDepositOverride(address key, address key1) external view returns (uint256);
    function defaultMaxDepositPerTx() external view returns (uint256);
    event Deposited();
    event Released();
    event PlatformFeeAccrued();
    event PlatformRevenueWithdrawn();
    event StrayTokenSwept();
    event TokenAllowedUpdated();
    function setAllowedToken(address token_, bool allowed_) external;
    function setSenderDepositBlacklisted(address account_, bool blacklisted_) external;
    function setPayoutBlacklisted(address account_, bool blacklisted_) external;
    function setDefaultMaxDepositPerTx(uint256 max_) external;
    function setMaxDepositOverride(address sender_, address token_, uint256 maxAmount_) external;
    function accountedAssets(address token) external view returns (uint256);
    function strayBalance(address token) external view returns (uint256);
    function depositWithPermit(address token, address account, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
    function deposit(address token, address account, uint256 amount) external;
    function release(address token, address account, uint256 amount, address recipient) external;
    function settleIncentiveRelease(address token, address account, address payout, uint256 gross, uint16 feeBps) external returns (uint256 fee);
    function withdrawPlatformRevenue(address token, address to, uint256 amount) external;
    function sweepStrayToken(address token, address to, uint256 amount) external;
}
