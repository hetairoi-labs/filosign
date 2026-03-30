# Filosign Technical Context (LLM-Optimized)

This document provides extensive technical details, schemas, and logic for the Filosign platform. It is designed as a context-rich reference for developers and LLMs.

---

## 1. Database Architecture (Drizzle ORM)

### **Tables & Schemas**

#### `files`
Tracks the primary document record and its Filecoin PieceCID.
```typescript
export const files = t.pgTable("files", {
    pieceCid: t.text().notNull().primaryKey(),
    sender: tEvmAddress().notNull().references(() => users.walletAddress),
    status: t.text({ enum: ["s3", "foc", "unpaid_for", "invalid"] }).notNull(),
    onchainTxHash: tBytes32().unique().notNull(),
    ...timestamps,
});
```

#### `file_participants`
Links wallets to files with specific roles (sender, viewer, signer) and encrypted encryption keys.
```typescript
export const fileParticipants = t.pgTable("file_participants", {
    filePieceCid: t.text().notNull().references(() => files.pieceCid, { onDelete: "cascade" }),
    wallet: tEvmAddress().notNull().references(() => users.walletAddress),
    role: t.text({ enum: ["sender", "viewer", "signer"] }).notNull(),
    kemCiphertext: tHex().notNull(),
    encryptedEncryptionKey: tHex().notNull(),
    ...timestamps,
});
```

#### `file_signatures`
Stores cryptographic signatures from participants.
```typescript
export const fileSignatures = t.pgTable("file_signatures", {
    filePieceCid: t.text().notNull().references(() => files.pieceCid, { onDelete: "cascade" }),
    signer: t.text().notNull(),
    evmSignature: tHex().notNull(),
    dl3Signature: tHex().notNull(),
    onchainTxHash: t.text(),
    ...timestamps,
});
```

---

## 2. Smart Contract Infrastructure

### **FSFileRegistry.sol**
The source of truth for file registration and signature verification.

#### **Commitment Logic**
The registry uses a `signersCommitment` to verify that the list of signers provided during individual signing matches the original registration list.
```solidity
function computeSignersCommitment(address[] calldata signers_) public pure returns (bytes20) {
    // Computed as ripemd160(abi.encodePacked(signers_))
    // Signers list must be sorted to ensure consistency
}
```

#### **World ID Verification**
```solidity
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
    // signalHash = uint256(keccak256(abi.encodePacked(lowercaseAddress:pieceCid))) >> 8
    worldId.verifyProof(root_, 1, signalHash, nullifierHash_, signDocExternalNullifier, proof_);
    // ... update signature count and trigger releaseIncentives ...
}
```

### **FSManager.sol & FSEscrow.sol**
Orchestrates incentives and manages token balances.

#### **Incentive Attachment**
Supports standard allowance flow and `permit` (EIP-2612) for gas-efficient token deposits.
```solidity
function attachIncentiveWithPermit(...) external onlyServer {
    // 1. setSignerIncentive in FileRegistry
    // 2. depositWithPermit in FSEscrow
}
```

#### **Escrow Release**
An atomic operation that releases tokens only when `allSigned` is true.
```solidity
function release(address token, address account, uint256 amount, address recipient) external onlyManager {
    // balances mapping tracks tokens by sender (account) and token type
    balances[account][token] -= amount;
    IERC20(token).safeTransfer(recipient, amount);
}
```

---

## 3. API Surface & Data Shapes

### **File Upload Flow**
1.  **POST `/files/upload/start`**: Returns a presigned S3 URL.
2.  **S3 Upload**: Client uploads document directly to S3.
3.  **POST `/files/`**: Server validates PieceCID, Piece size (10MB limit), and registers metadata.
4.  **S3-to-Filecoin transition**: Background job moves file from S3 to warm storage.

### **Zod Schemas**
#### **World ID Proof Structure**
```typescript
const zIDKitResult = z.object({
    responses: z.array(z.object({
        proof: zHexString(),
        merkle_root: zHexString(),
        nullifier: zHexString(),
    })),
    protocol_version: z.string(),
});
```

---

## 4. Cryptographic Context

### **Signal Hashing (World ID)**
The signal used for World ID is a combination of the signer's wallet (lowercase) and the file's PieceCID. This ensures the proof is tied to a specific signer-document pair.
`signal = keccak256(abi.encodePacked(Strings.toHexString(signer), ":", pieceCid))`

### **Dilithium Signatures**
Filosign uses CRYSTALS-Dilithium via WASM (`dilithium-crystals-js`) for post-quantum secure signing. The `dl3SignatureCommitment` stored on-chain is a cryptographic hash of the Dilithium signature, providing high-integrity evidence without on-chain signature verification costs.

---

## 5. Technical Constraints & Rules

1.  **File Size**: 10MB (`10 * 1024 * 1024` bytes) enforced in `DocumentUpload.tsx`.
2.  **MIME Type**: `application/pdf` enforced.
3.  **Registration**: `onlyServer` modifier on `registerFile` and `registerKeys` ensures all on-chain registrations are relayed through Filosign's managed keys (meta-transactions).
4.  **Network Configuration**: `ChainKey` mapping standardizes contract interactions across networks:
    ```typescript
    const ChainKey = {
      local: 31337,
      testnet: 11155111, // Sepolia
      mainnet: 1,
    } as const;
    ```

---
© 2026 Filosign Infrastructure Data Group.
