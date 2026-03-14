// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../interfaces/IWorldID.sol";

/// @notice Mock World ID for local/hardhat testing. No-op verifyProof.
contract MockWorldID is IWorldID {
    function verifyProof(
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256[8] calldata
    ) external view override {}
}
