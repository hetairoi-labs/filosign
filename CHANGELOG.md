# Filosign: What we've been up to?

We started Filosign with one mission: To revolutionize the traditional centralized document signing infrastructure and replace the trust with trustless, modern, privacy-centric, and mathematically verified foundation. Today we are rolling out some of the biggest upgrades we have been working on for the past two months, including real human verification with World ID, automated payouts and incentives on signing, end-to-end gasless meta transactions, and various platform stability and UX upgrades including completely responsive mobile-first design, enriched compliance report generation and many more.

Filosign isn't just about "signing documents." It's about creating a trustless, privacy-preserving infrastructure for digital identity and financial incentives. This document explores the technical What, Why, and How of our latest upgrades.

> Watch our hackathon submission demo video here: [Demo Video](https://www.youtube.com/watch?v=2MUCS4vPHSk)

> **Deployment Status**: The Filosign smart contracts are fully deployed and verified on **World Chain Sepolia**.
>
> - **[FSManager](https://sepolia.worldscan.org/address/0xe1320f254f04d77eba72ef7eb46e62cc4247baf2)**: `0xe1320f254F04D77eba72eF7EB46e62cC4247bAF2`
> - **[FSFileRegistry](https://sepolia.worldscan.org/address/0x217d631aea3120E7B95435c0d1Fa6ac90F398634)**: `0x217d631aea3120E7B95435c0d1Fa6ac90F398634`
> - **[FSKeyRegistry](https://sepolia.worldscan.org/address/0xbc1f603b72789B011b1DA5cbecf2d6c9F6dde94A)**: `0xbc1f603b72789B011b1DA5cbecf2d6c9F6dde94A`
> - **[FSWorldVerifier](https://sepolia.worldscan.org/address/0x12eF457d3724a512F4c1CBb31EDc59ad95233d75)**: `0x12eF457d3724a512F4c1CBb31EDc59ad95233d75`

___

## 1. World ID: Privacy-Preserving Proof of Personhood

We've integrated World ID (on World Chain) into the core signing flow. This allows signers to prove they are unique humans without revealing their real-world identity or wallet history.

In traditional document signing, "identity" is often just an email or a wallet address. But emails can be spoofed, and wallets can be automated. By using World ID, we ensure Sybil resistance: one human = one signature. This is critical for legal contracts, voting, or high-value settlements where personhood is non-negotiable.

The process starts in the frontend by linking your World ID at the registration step, which you would use to sign all your agreements. We have used **IDKit v4** to generate the World ID proof and world router on World Chain to verify these proofs entirely on-chain.

The contract verifies the proof against the World ID Router. If the proof is valid and the nullifier hasn't been used for this file, the signature is recorded.

```solidity
// From FSFileRegistry.sol
function registerFileSignatureWorldId(
    string calldata pieceCid_,
    address sender_,
    address signer_,
    bytes20 dl3SignatureCommitment_,
    uint256 root_,
    uint256 nullifierHash_,
    uint256[8] calldata proof_,
    uint256 timestamp_,
    bytes calldata signature_,
    address[] calldata allSigners_
) external onlyServer {
    // 1. Verify the proof against the World ID Router
    worldId.verifyProof(
        root_,
        1, // groupId
        signalHash,
        nullifierHash_,
        signDocExternalNullifier,
        proof_
    );

    // 2. record the signature
    file.signatures[signer_] = signature_;
    file.signaturesCount++;

    // 3. Trigger incentive release if all signed
    if (file.signaturesCount == file.signersCount) {
        manager.releaseIncentives(pieceCid_, allSigners_);
    }
}
```

### **Summary**

- **IDKit v4 Integration**: Integrated Worldcoin IDKit (v4) for user login and document signing verification.
- **Improved Signature Flow**: Built out the World ID RP (Relying Party) signature flow, including new server endpoints and client-side context fetching hooks. [world.ts](./packages/server/lib/utils/world.ts)
- **On-chain Support**: Updated core smart contracts to support World ID verification, introducing methods like `LinkWallet` and `registerFileSignatureWorldId`. [FSWorldVerifier.sol](./packages/contracts/src/FSWorldVerifier.sol), [FSFileRegistry.sol](./packages/contracts/src/FSFileRegistry.sol)

---

## 2. Incentivized Signing: The Trustless Escrow

We've built an incentivized signing system where a document's sender can attach ERC20 token rewards to a signature. These tokens are held in a secure escrow contract.

Legal settlements, freelance contracts, and advisory agreements often require "payment on signature." Traditionally, this is a manual, trust-based process. Filosign makes it atomic: the moment the final signature is verified on-chain, the escrow releases the payment directly to the signers. No intermediaries, no "waiting for the wire."

When a sender attaches an incentive, tokens are transferred from their wallet into the `FSEscrow` contract via `FSManager`. These tokens are "locked" to the document's PieceCID. When the `FSFileRegistry` detects that the signature count is complete, it calls `releaseIncentives` on `FSManager`.

```solidity
// From FSManager.sol
function releaseIncentives(
    string calldata pieceCid_,
    address[] calldata signers_
) external onlyServerOrFileRegistry {
    // Check that everyone has signed before any release
    require(FSFileRegistry(fileRegistry).allSigned(cidId), NotAllSigned());

    for (uint256 i = 0; i < signers_.length; i++) {
        address signer = signers_[i];
        (address token, uint256 amount, bool claimed) = FSFileRegistry(fileRegistry).getSignerIncentive(cidId, signer);

        if (amount > 0 && !claimed) {
            // Mark as claimed to prevent re-entrancy/double-spend
            FSFileRegistry(fileRegistry).markIncentiveClaimed(cidId, signer);
            // Release tokens from escrow directly to the signer
            FSEscrow(escrow).release(token, sender, amount, signer);
        }
    }
}
```

### **Practical Application: Proof of Contribution**

In a real-world scenario, this infrastructure functions as a "Proof of Contribution" layer. Freelance developers can sign verifiable service agreements and receive automated, trustless payouts. In our demonstration, once the developer signs via World ID, the funds are released atomically from the Filosign escrow, creating a Sybil-proof settlement layer for international contracts.

### **Summary**

- **Atomic Release**: Built an atomic incentive release system using on-chain signer commitments. Payouts now execute automatically inside the final signature transaction. [FSFileRegistry.sol](./packages/contracts/src/FSFileRegistry.sol)
- **Escrow Tracking**: Integrated escrow and per-signer incentive tracking directly into the smart contracts. [FSWorldVerifier.sol](./packages/contracts/src/FSWorldVerifier.sol)
- **ERC20 Permit Support**: Added front-end support for ERC20 tokens using permit based allowance as well as native allowance, enabling senders to attach token incentives to files and configuring recipient dialogs to handle them. [useAttachIncentiveToFile.ts](./packages/lib/react-sdk/src/hooks/files/useAttachIncentiveToFile.ts), [/api/files/incentive](./packages/server/api/routes/files/index.ts)

---

## 3. Gasless **Server-Sponsored Meta-Transactions**

Web3 onboarding is historically difficult because new users need native network tokens to perform basic actions. Filosign eliminates this friction by shifting the gas burden to our backend infrastructure. Gasless server-sponsored meta-transactions now cover 99% of the on-chain actions, so that users never have to worry about gas tokens for any action including Registration, Sending and Signing flows.

```solidity
// From FSKeyRegistry.sol
function registerKeys(
    address user_,
    string calldata signaturePublicKey_,
    string calldata encryptionPublicKey_,
    bytes calldata signature_
) external onlyServer {
    // Server relays the message, but we verify the user's signature locally
    require(
        validateRegistrationSignature(user_, signaturePublicKey_, encryptionPublicKey_, signature_),
        "Invalid registration signature"
    );
    // ... store keys ...
}
```

This means contract workers can prove their humanity via World ID, sign a contract, and receive an automated payout without ever needing to fund a wallet first.

**Security Note:** Our `onlyServer` modifiers ensure the server only pays the gas. The smart contracts still independently verify the World ID ZK proofs and the signer's cryptographic commitments. The server cannot alter the document, list of signers or the escrowed funds.

---

## 4. Mobile-First Architecture, UX Improvements, Stability & Compliance

Filosign features a strict mobile-first architecture. The entire flow, from PDF upload to World ID verification and final atomic payout, operates flawlessly within a mobile webview. This makes the platform perfectly suited for the World App ecosystem and everyday mobile users, offering a hyperscale ready infrastructure for the future of digital work. We are also planning to rollout Filosign to the World Chain ecosystem by launching our own World Mini App. (testing MiniKit integrations internally, stay tuned for updates)!

We have also added a feature to generate and download a compliance report for any signed file. The Compliance Report "glues" everything together, providing a human-readable PDF that contains cryptographic proof of every signature and incentive recorded on-chain for legal and audit purposes.

### **Summary**

- **Mainnet Launch:**: Following the launch of FOC (Filecoin on-chain cloud) on mainnet, we are now getting ready to launch Filosign on mainnet as well, open to general public. 
- **Network Deployment**: Migrated to World Chain (Sepolia testnet) for supporting WorldID Router verification and blazing fast on-chain settlements.
- **WASM Optimization**: Custom ESM module support for our `dilithium-crystals-js` signing library to fix WASM initialization and loading issues in certain browsers like Safari.
- **Bug Fixes**: Various bug fixes across the app to improve stability and performance, New edge deployment for improved load time (50% faster now), and reducing crashes.

---

© 2026 Filosign. Trustless standard for permanent agreements.
