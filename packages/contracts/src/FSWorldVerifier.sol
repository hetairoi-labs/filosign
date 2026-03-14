// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.26;

import "./interfaces/IWorldID.sol";

contract FSWorldVerifier {
    IWorldID public immutable worldId;
    uint256 public immutable externalNullifier;

    mapping(uint256 => address) public nullifierToAddress;
    mapping(address => uint256) public addressToNullifier;
    mapping(uint256 => bool) public usedNullifiers;

    error AddressAlreadyLinked();
    error NullifierAlreadyLinked();

    constructor(
        IWorldID _worldId,
        string memory _appId,
        string memory _actionId
    ) {
        worldId = _worldId;
        uint256 appIdHash = hashToField(abi.encodePacked(_appId));
        externalNullifier = hashToField(abi.encodePacked(appIdHash, _actionId));
    }

    function linkWallet(
        address wallet,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external {
        if (addressToNullifier[wallet] != 0) revert AddressAlreadyLinked();
        if (usedNullifiers[nullifierHash]) revert NullifierAlreadyLinked();

        uint256 signalHash = hashToField(abi.encodePacked(wallet));

        worldId.verifyProof(
            root,
            1, // 1 denotes Orb validation
            signalHash,
            nullifierHash,
            externalNullifier,
            proof
        );

        usedNullifiers[nullifierHash] = true;
        nullifierToAddress[nullifierHash] = wallet;
        addressToNullifier[wallet] = nullifierHash;
    }

    function hashToField(bytes memory value) internal pure returns (uint256) {
        return uint256(keccak256(value)) >> 8;
    }
}
