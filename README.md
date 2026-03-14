# Filosign

Trustless digital signatures on the decentralized web. Replace trust-in-a-provider with math: agreements stay secure, verifiable, and permanent on Filecoin.

[![Website](https://img.shields.io/badge/Website-app.filosign.xyz-blue)](https://app.filosign.xyz)
[![GitHub](https://img.shields.io/badge/GitHub-filosign--dapp-black)](https://github.com/filosign-dapp)

**[Try the app](https://app.filosign.xyz)** · [Documentation](https://docs.filosign.xyz) · [Contributing](CONTRIBUTING.md)

## Overview

Standard e-signature tools depend on a central company to hold and verify your documents. Filosign anchors every signature to the blockchain so anyone can verify authenticity without trusting a third party. Documents can't be altered, lost, or disputed after the fact.

**What you get:**

- **Post-quantum crypto** — Signatures stay valid even after quantum computers exist
- **On-chain proof** — Every signature is a permanent, independently verifiable transaction
- **Encryption by default** — Documents are encrypted on your device before they leave
- **Decentralized storage** — Files live on Filecoin, not in a single vendor's datacenter
- **Direct payments** — USDFC subscriptions without intermediary fees

## Getting Started

1. **Connect wallet** — MetaMask, Coinbase Wallet, or any Web3 wallet
2. **Create account** — Two-factor auth with PIN + wallet
3. **Upload & share** — Add documents and invite signers
4. **Sign** — Draw, type, or upload your signature
5. **Verify** — Signatures are recorded on-chain; anyone can check them

## Use Cases

- **Legal** — Contracts with cryptographic proof of who signed and when
- **Business** — High-value agreements that need permanent, auditable records
- **Real estate** — Property documents with tamper-evident signatures
- **Financial** — Compliance and audit trails backed by the blockchain

## How It Works

**1. Connect & authenticate**  
Link your Web3 wallet and set a PIN. Keys are created on your device; the server never sees or stores them.

**2. Upload & encrypt**  
Documents are encrypted on your device with post-quantum algorithms before upload. Each file gets its own key.

**3. Share**  
Invite signers via the app. Recipients only see documents they're explicitly granted access to.

**4. Sign & verify**  
Sign with draw, type, or upload. Each signature is verified and anchored to the blockchain.

**5. Audit**  
Every action is recorded on-chain. Anyone can check authenticity, timestamp, and integrity of a signed document.

## Security

- **Keys stay on your device** — Private keys never leave it; the server only coordinates
- **Post-quantum algorithms** — Kyber and Dilithium so signatures remain secure against future quantum attacks
- **On-chain record** — Signature, timestamp, and document hash are permanently stored on Filecoin

## Development

```bash
git clone https://github.com/filosign-dapp/client.git
cd client && bun install

# Full local stack (blockchain, API, client with hot reload)
./scripts/serloc.sh

# Integration tests (separate terminal)
cd test && bun run dev
```

### SDK

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

Full integration guides: [docs.filosign.xyz](https://docs.filosign.xyz)

## Contributing

Contributions from developers, designers, and anyone interested in crypto or UX are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and workflow.

## Links

- [Website](https://app.filosign.xyz)
- [Demo](https://www.loom.com/share/8e142c8bb06f43edb0a18162222f96f8)
- [Documentation](https://docs.filosign.xyz)
- [Issues](https://github.com/filosign-dapp/client/issues)

## Contact

hello@filosign.xyz · [@filosign](https://twitter.com/filosign)

## License

AGPL-3.0-or-later
