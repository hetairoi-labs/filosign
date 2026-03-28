// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Auto-generated from src/FSEscrow.sol — DO NOT EDIT (regenerate with the script only)

interface IFSEscrow {
    function manager() external view returns (address);
    function balances(address key, address key1) external view returns (uint256);
    event Deposited();
    event Released();
    function depositWithPermit(address token, address account, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
    function deposit(address token, address account, uint256 amount) external;
    function release(address token, address account, uint256 amount, address recipient) external;
}
