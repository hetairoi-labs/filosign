# Filosign Smart Contracts

A suite of Solidity smart contracts implementing decentralized document signing and cryptographic key management on Ethereum-compatible blockchains.

## Overview

Filosign provides a decentralized e-signature platform with three core contracts:

- **FSManager**: Central registry and access control management
- **FSFileRegistry**: Document registration, acknowledgment, and signature management
- **FSKeyRegistry**: Cryptographic key generation data storage and verification

## Architecture

### FSManager Contract

The main contract that coordinates the entire system:

- Deploys and manages FSFileRegistry and FSKeyRegistry contracts
- Handles sender approval system (recipients approve senders who can send them documents)
- Manages contract versioning
- Server-controlled administrative functions

### FSFileRegistry Contract

Manages the document signing lifecycle:

- **Document Registration**: Register documents using CID (Content Identifier) pieces
- **Acknowledgment**: Recipients acknowledge receipt of documents before signing
- **Signature Submission**: Submit cryptographic signatures with visual hashes
- **Data Retrieval**: Query document and signature information on-chain

### FSKeyRegistry Contract

Handles cryptographic identity management:

- **Key Registration**: Store encrypted key generation data and public keys
- **PIN Verification**: Zero-knowledge PIN verification using commitment hashes
- **Version Management**: Track keygen data versions tied to platform versions

## Key Features

### Decentralized Trust Model

- Recipients approve trusted senders for document exchange
- All signatures and document states are immutably stored on-chain
- Cryptographic verification of all operations

### Secure Key Management

- Encrypted seed storage with PIN-based access
- Commitment-based PIN verification (zero-knowledge)
- Version-controlled key regeneration

### Document Lifecycle

1. **Registration**: Documents are registered with CID identifiers
2. **Acknowledgment**: Recipients confirm receipt
3. **Signing**: Cryptographic signatures are submitted and verified
4. **Verification**: All parties can verify signatures and document integrity

## Installation

```bash
bun add @filosign/contracts
```

## Usage

```typescript
import { getContracts } from "@filosign/contracts";

// Initialize contracts with wallet
const contracts = getContracts(walletClient);

// Register a document for signing
await contracts.FSFileRegistry.write.registerFile([
  pieceCidPrefix,
  pieceCidTail,
  recipientAddress,
]);

// Acknowledge document receipt
await contracts.FSFileRegistry.write.acknowledge([cidIdentifier]);

// Submit signature
await contracts.FSFileRegistry.write.submitSignature([
  cidIdentifier,
  signatureVisualHash,
  v,
  r,
  s,
]);

// Query document data
const fileData = await contracts.FSFileRegistry.read.getFileData([
  cidIdentifier,
]);
const signatureData = await contracts.FSFileRegistry.read.getSignatureData([
  cidIdentifier,
]);
```

## API Reference

### FSManager Functions

#### Write Functions

- `approveSender(address sender_)` - Approve a sender to send documents to you
- `setActiveVersion(uint8 version_)` - Update contract version (server only)

#### Read Functions

- `approvedSenders(address recipient, address sender)` - Check if sender is approved
- `version()` - Get current contract version

### FSFileRegistry Functions

#### Write Functions

- `registerFile(bytes32 pieceCidPrefix_, uint16 pieceCidTail_, address recipient_)` - Register document
- `acknowledge(bytes32 cidIdentifier_)` - Acknowledge document receipt
- `submitSignature(bytes32 cidIdentifier_, bytes32 signatureVisualHash_, uint8 v_, bytes32 r_, bytes32 s_)` - Submit signature

#### Read Functions

- `getFileData(bytes32 cidIdentifier_)` - Get document information
- `getSignatureData(bytes32 cidIdentifier_)` - Get signature information
- `cidIdentifier(bytes32 pieceCidPrefix_, uint16 pieceCidTail_)` - Generate CID identifier

### FSKeyRegistry Functions

#### Write Functions

- `registerKeygenData(KeygenData memory data_, bytes32 publicKey_)` - Register cryptographic keys

#### Read Functions

- `isRegistered(address user_)` - Check if user is registered
- `keygenData(address user_)` - Get key generation data
- `publicKeys(address user_)` - Get user's public key

## Development

```bash
# Install dependencies
bun install

# Compile contracts
bun run compile

# Run tests
bun run test

# Deploy to local network
bun run deploy:local

# Generate TypeScript bindings
bun run generate-types
```

## Security Features

- **Access Control**: Only authorized parties can perform operations
- **Cryptographic Verification**: All signatures are verified on-chain
- **State Validation**: Comprehensive require statements prevent invalid states
- **Upgradeable Architecture**: Version management for future enhancements

## Integration with Filosign Platform

The contracts integrate with:

- **Crypto Utils**: For cryptographic key derivation and verification
- **Client Library**: For high-level API interactions
- **File Storage**: For decentralized document storage (IPFS/Filecoin)

## License

AGPL-3.0-or-later
