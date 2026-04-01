# Filosign

Trustless digital signatures on the decentralized web. Replace trust in a provider with math: agreements stay secure, verifiable, and permanent on Filecoin.

[Website](https://app.filosign.xyz)  
[GitHub](https://github.com/filosign-dapp)

---

> **PL-Genesis Submission:** Please read our [CHANGELOG.md](CHANGELOG.md) for full details on our hackathon submission including World ID integration, World Chain deployment, Zero-Gas UX, and Proof of Contribution escrow infrastructure.

---

## Overview

Standard e-signature tools depend on a central company to hold and verify your documents. Filosign anchors every signature to the blockchain so anyone can verify authenticity without trusting a third party. Documents cannot be altered, lost, or disputed after the fact.

**What you get:**

- **Proof of personhood:** World ID integration ensures one human equals one signature, eliminating bot farming.
- **Trustless escrow:** Attach ERC20 bounties to contracts that release atomically upon final signature.
- **Zero-gas UX:** Server-sponsored meta-transactions allow users to sign and get paid without needing native tokens.
- **Post-quantum crypto:** Signatures stay valid even after quantum computers exist.
- **On-chain proof:** Every signature is a permanent, independently verifiable transaction.
- **Decentralized storage:** Files live on Filecoin, not in a single vendor's datacenter.

## Getting Started

1. **Upload & encrypt:** Add your document (up to 10MB PDF). It encrypts on your device before leaving.
2. **Set bounty (Optional):** Senders can attach a USDC payment that unlocks when the document is signed.
3. **Share:** Invite signers via the app.
4. **Verify & sign:** Signers prove their humanity via World ID to execute the agreement gas-free.
5. **Atomic payout:** The smart contract escrow routes the funds instantly to the signer.

## Use Cases

- **Freelance & Contract Work:** Contracts with automated, trustless payouts upon signature.
- **Legal:** Agreements with cryptographic proof of who signed and when.
- **Business:** High-value agreements that need permanent, auditable records.
- **Financial:** Compliance and audit trails backed by the blockchain.

## How It Works

**1. Upload & encrypt** Documents are encrypted on your device with post-quantum algorithms before upload. Each file gets its own key.

**2. Attach incentives** Senders can lock ERC20 tokens in the Filosign smart contract escrow.

**3. Verify & execute** Signers verify their identity using World ID. Our relayer server handles the gas fees, submitting the signature registry on-chain via meta-transactions.

**4. Settle** The moment the final signature hits the blockchain, the escrow releases payment directly to the signers. 

**5. Audit** A cryptographic Compliance Report is generated. Anyone can check the authenticity, timestamp, and integrity of the document and payout.

## Security

- **Keys stay on your device:** Private keys never leave it; the server only coordinates.
- **Post-quantum algorithms:** Kyber and Dilithium ensure signatures remain secure against future quantum attacks.
- **Sybil resistance:** World ID prevents fraudulent signatures.
- **Trustless execution:** Smart contracts handle all payouts, meaning the server cannot access escrowed funds.

## Development

```bash
git clone [https://github.com/filosign-dapp/client.git](https://github.com/filosign-dapp/client.git)
cd client && bun install

# Full local stack (blockchain, API, client with hot reload)
./scripts/serloc.sh

# Integration tests (separate terminal)
cd test && bun run dev
```

