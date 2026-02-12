# Filosign

Trustless digital signatures for the decentralized web. Filosign replaces fragile platform trust with permanent mathematical proof, ensuring your agreements are secure, verifiable, and immutable on the Filecoin network.

[![Website](https://img.shields.io/badge/Website-app.filosign.xyz-blue)](https://app.filosign.xyz)
[![GitHub](https://img.shields.io/badge/GitHub-filosign--dapp-black)](https://github.com/filosign-dapp)

## Overview

Traditional e-signature platforms require you to trust a centralized provider. Filosign eliminates this risk by anchoring every signature to the blockchain, providing mathematical certainty that your documents cannot be altered, lost, or invalidated.

**Key capabilities:**

- Post-quantum cryptography resistant to quantum computing attacks
- Blockchain-anchored signatures as permanent, verifiable transactions
- End-to-end encryption from document creation to delivery
- Decentralized storage on Filecoin's network
- USDFC subscription payments with no intermediary fees

## Getting Started

1. **Connect Wallet** — Link your Web3 wallet (MetaMask, Coinbase, etc.)
2. **Create Account** — Set up dual-factor authentication with PIN + wallet
3. **Upload & Share** — Upload documents and invite signers
4. **Sign** — Use drawing, typing, or upload signature methods
5. **Verify** — All signatures are immutably recorded on-chain

## Use Cases

- **Legal** — Contract signing with cryptographic proof
- **Business** — High-value agreements requiring permanent verification
- **Real Estate** — Property documents with immutable signatures
- **Financial Services** — Regulatory compliance with blockchain audit trails

## Features

### Security

- Dual-factor authentication (PIN + wallet signature)
- Quantum-resistant cryptography (Kyber + Dilithium)
- Zero-trust architecture — server never sees private keys
- Immutable on-chain records

### Document Management

- Universal format support (PDF, DOC, images)
- Multi-signer workflows (sequential or parallel)
- Real-time status updates
- Complete audit trail

### Web3 Integration

- Any Web3 wallet
- Filecoin decentralized storage
- USDFC token payments
- Ethereum and Filecoin network support

## How It Works

### 1. Connect & Authenticate

Link your Web3 wallet and set up dual-factor security with a PIN. Cryptographic keys are generated client-side — private information is never stored server-side.

### 2. Upload & Encrypt

Documents are encrypted on your device before upload using quantum-resistant algorithms. Each file receives a unique encryption key.

### 3. Share Securely

Invite signers through the permission system. Recipients can only access files they've been explicitly granted permission to view.

### 4. Sign & Verify

Signatures are created using familiar methods (draw, type, or upload), cryptographically verified, and permanently anchored to the blockchain.

### 5. Audit & Prove

All actions are immutably recorded on-chain. Anyone can independently verify the authenticity, timestamp, and integrity of any signed document.

## Security Model

**Zero-Trust Design**
- Private keys never leave your device
- Documents encrypted before transmission
- Server acts only as coordinator

**Quantum-Resistant**
- Post-quantum cryptographic algorithms (Kyber, Dilithium)
- Secure against future quantum computers

**Blockchain Verification**
- Every signature, timestamp, and document hash permanently recorded on Filecoin
- Mathematical proof of authenticity

## Development

### Setup

```bash
git clone https://github.com/filosign-dapp/client.git
cd client && bun install

# Start local development
./scripts/serloc.sh

# Run integration tests
cd test && bun run dev
```

### SDK Integration

```typescript
import { FilosignProvider, useFilosignClient } from '@filosign/react';

function MyApp() {
  return (
    <FilosignProvider config={{ apiBaseUrl: "https://api.filosign.xyz" }}>
      <DocumentSigner />
    </FilosignProvider>
  );
}
```

See the [documentation](https://docs.filosign.xyz) for complete integration guides.

## Contributing

Contributions welcome from developers, designers, and cryptography experts.

```bash
git checkout -b feature/your-feature
# Make changes and test
# Submit a pull request
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Links

- [Website](https://app.filosign.xyz)
- [Demo Video](https://www.loom.com/share/8e142c8bb06f43edb0a18162222f96f8)
- [Documentation](https://docs.filosign.xyz)
- [Issues](https://github.com/filosign-dapp/client/issues)

## Contact

- Email: hello@filosign.xyz
- Twitter: [@filosign](https://twitter.com/filosign)

## License

AGPL-3.0-or-later
