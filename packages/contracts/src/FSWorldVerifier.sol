// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/IWorldID.sol";

contract FSWorldVerifier {
    IWorldID public immutable worldId;
    uint256 public immutable externalNullifier;

    mapping(uint256 => address) public nullifierToAddress;
    mapping(address => uint256) public addressToNullifier;
    mapping(uint256 => bool) public usedNullifiers;

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
        require(addressToNullifier[wallet] == 0, "Address already linked");
        require(!usedNullifiers[nullifierHash], "Nullifier already linked");

        // IDKit signal is sent as a lowercase address string (e.g. 0xabc...),
        string memory walletSignal = Strings.toHexString(uint160(wallet), 20);
        uint256 signalHash = hashToField(abi.encodePacked(walletSignal));

        worldId.verifyProof(
            root,
            1,
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
