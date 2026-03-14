// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Auto-generated from src/FSWorldVerifier.sol — DO NOT EDIT (regenerate with the script only)

import "./IWorldID.sol";

interface IFSWorldVerifier {
    function worldId() external view returns (address);
    function externalNullifier() external view returns (uint256);
    function nullifierToAddress(uint256 key) external view returns (address);
    function addressToNullifier(address key) external view returns (uint256);
    function usedNullifiers(uint256 key) external view returns (bool);
    function linkWallet(address wallet, uint256 root, uint256 nullifierHash, uint256[8] calldata proof) external;
}
