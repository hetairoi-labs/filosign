---
name: Flow Integration Implementation
overview: Concrete implementation plan for Flow blockchain integration with smart escrow and automated payroll. Provides step-by-step instructions, code examples, and file structures to transform Filosign from static signing to active contract execution with cross-chain payment automation.
todos:
  - id: "1"
    content: Create Flow package structure and install dependencies
    status: pending
  - id: "2"
    content: Implement FilosignEscrow.cdc contract with USDC vault
    status: pending
  - id: "3"
    content: Implement FilosignPayroll.cdc contract for streaming payments
    status: pending
  - id: "4"
    content: Create FlowOracle TypeScript class for cross-chain oracle
    status: pending
  - id: "5"
    content: Extend indexer processor to trigger Flow payments on signature completion
    status: pending
  - id: "6"
    content: Add file_payments table to database schema
    status: pending
  - id: "7"
    content: Create PaymentSetup React component for document creation
    status: pending
  - id: "8"
    content: Integrate payment flow into existing document creation process
    status: pending
  - id: "9"
    content: Write Cadence tests for escrow and payroll contracts
    status: pending
  - id: "10"
    content: Deploy contracts to Flow Testnet and test end-to-end
    status: pending
  - id: "11"
    content: Security audit and mainnet deployment preparation
    status: pending
isProject: false
---

# Flow Integration Implementation Plan

## Overview

Transform Filosign from static document signing to active contract execution. When all parties sign a document, automatically trigger USDC escrow release or payroll streams on Flow blockchain.

**Architecture**: Filecoin FVM (signatures) → Filosign Indexer (oracle) → Axelar GMP (cross-chain) → Flow (payment execution)

---

## Phase 1: Project Setup & Dependencies

### Step 1.1: Create Flow Package Structure

**New Directory Structure:**

```
packages/
  flow/
    contracts/
      FilosignEscrow.cdc
      FilosignPayroll.cdc
    transactions/
      CreateEscrow.cdc
      ReleaseEscrow.cdc
      CreateStream.cdc
    scripts/
      GetEscrowStatus.cdc
      GetStreamStatus.cdc
    tests/
      escrow_test.cdc
    flow.json              # Flow CLI config
    package.json           # Flow dependencies
```

**Create Directory:**

```bash
mkdir -p packages/flow/{contracts,transactions,scripts,tests}
```

### Step 1.2: Install Flow CLI & Dependencies

**File:** `[packages/flow/package.json](packages/flow/package.json)`

```json
{
  "name": "@filosign/flow",
  "version": "1.0.0",
  "scripts": {
    "dev": "flow emulator start",
    "deploy:local": "flow project deploy --network emulator",
    "deploy:testnet": "flow project deploy --network testnet",
    "test": "flow test",
    "generate-escrow": "node scripts/generate-escrow.js"
  },
  "dependencies": {
    "@onflow/fcl": "^1.6.0",
    "@onflow/types": "^1.1.0"
  },
  "devDependencies": {
    "@onflow/flow-js-testing": "^0.3.0"
  }
}
```

**Install:**

```bash
cd packages/flow && bun install
```

### Step 1.3: Initialize Flow Configuration

**File:** `[packages/flow/flow.json](packages/flow/flow.json)`

```json
{
  "emulators": {
    "default": {
      "port": 3569,
      "serviceAccount": "emulator-account"
    }
  },
  "contracts": {
    "FilosignEscrow": "./contracts/FilosignEscrow.cdc",
    "FilosignPayroll": "./contracts/FilosignPayroll.cdc",
    "FungibleToken": {
      "source": "./node_modules/@onflow/flow-ft/contracts/FungibleToken.cdc",
      "aliases": {
        "emulator": "0xee82856bf20e2aa6",
        "testnet": "0x9a0766d93b6608b7",
        "mainnet": "0xf233dcee88fe0abe"
      }
    },
    "FlowToken": {
      "source": "./node_modules/@onflow/flow-token/contracts/FlowToken.cdc",
      "aliases": {
        "emulator": "0x0ae53cb6e3f42a79",
        "testnet": "0x7e60df042a9c0868",
        "mainnet": "0x1654653399040a61"
      }
    },
    "FiatToken": {
      "source": "./node_modules/@onflow/usdc-standard/contracts/FiatToken.cdc",
      "aliases": {
        "testnet": "0xa983fecbed621163",
        "mainnet": "0xb19436aae4d94622"
      }
    }
  },
  "deployments": {
    "emulator": {
      "emulator-account": ["FilosignEscrow", "FilosignPayroll"]
    }
  },
  "accounts": {
    "emulator-account": {
      "address": "f8d6e0586b0a20c7",
      "key": " emulator-key-here"
    }
  }
}
```

---

## Phase 2: Cadence Smart Contracts

### Step 2.1: Create Escrow Contract

**File:** `[packages/flow/contracts/FilosignEscrow.cdc](packages/flow/contracts/FilosignEscrow.cdc)`

```cadence
import FungibleToken from "./FungibleToken.cdc"
import FiatToken from "./FiatToken.cdc"

pub contract FilosignEscrow {
    
    // Oracle authorization resource
    pub resource OracleAuth {
        pub let oracleAddress: Address
        
        init(oracleAddress: Address) {
            self.oracleAddress = oracleAddress
        }
    }
    
    // Escrow resource - holds USDC until conditions met
    pub resource Escrow {
        pub let docId: String           // Filecoin document CID
        pub let amount: UFix64          // USDC amount
        pub let payer: Address          // Who funded escrow
        pub let recipient: Address      // Who receives payment
        pub let requiredSigners: [String]  // Required wallet addresses
        pub var signedAddresses: [String]  // Who has signed
        pub var isReleased: Bool
        pub var createdAt: UFix64
        pub var expiresAt: UFix64?
        
        // Vault holding the USDC
        access(self) let vault: @FungibleToken.Vault
        
        init(
            docId: String,
            amount: UFix64,
            payer: Address,
            recipient: Address,
            requiredSigners: [String],
            vault: @FungibleToken.Vault,
            expiresAt: UFix64?
        ) {
            self.docId = docId
            self.amount = amount
            self.payer = payer
            self.recipient = recipient
            self.requiredSigners = requiredSigners
            self.signedAddresses = []
            self.isReleased = false
            self.vault <- vault
            self.createdAt = getCurrentBlock().timestamp
            self.expiresAt = expiresAt
        }
        
        // Oracle releases funds when document fully signed
        pub fun release(oracleProof: String, auth: &OracleAuth): @FungibleToken.Vault {
            pre {
                !self.isReleased: "Escrow already released"
                self.isFullySigned(): "Document not fully signed"
                self.isNotExpired(): "Escrow expired"
            }
            
            // Verify oracle proof
            assert(
                FilosignEscrow.verifyOracleRelease(oracleProof, self.docId),
                message: "Invalid oracle proof"
            )
            
            self.isReleased = true
            
            // Return the vault for transfer
            return <- self.vault.withdraw(amount: self.amount)
        }
        
        // Check if all required signers have signed
        pub fun isFullySigned(): Bool {
            for signer in self.requiredSigners {
                if !self.signedAddresses.contains(signer) {
                    return false
                }
            }
            return true
        }
        
        // Check if escrow expired
        pub fun isNotExpired(): Bool {
            if let expiry = self.expiresAt {
                return getCurrentBlock().timestamp < expiry
            }
            return true
        }
        
        // Record a signature (called via oracle)
        pub fun recordSignature(signerAddress: String, oracleProof: String) {
            assert(
                FilosignEscrow.verifyOracleSignature(oracleProof, self.docId, signerAddress),
                message: "Invalid oracle proof for signature"
            )
            
            if !self.signedAddresses.contains(signerAddress) {
                self.signedAddresses.append(signerAddress)
            }
        }
        
        destroy() {
            // Return funds to payer if not released
            if !self.isReleased {
                // Logic to return vault to payer
            }
            destroy self.vault
        }
    }
    
    // Storage for all escrows
    pub var escrows: @{String: Escrow}
    pub let oracleAuth: @OracleAuth
    
    // Events
    pub event EscrowCreated(
        docId: String,
        amount: UFix64,
        payer: Address,
        recipient: Address,
        requiredSigners: [String]
    )
    
    pub event EscrowReleased(
        docId: String,
        recipient: Address,
        amount: UFix64,
        timestamp: UFix64
    )
    
    pub event SignatureRecorded(
        docId: String,
        signerAddress: String,
        totalSignatures: Int
    )
    
    init(oracleAddress: Address) {
        self.escrows <- {}
        self.oracleAuth <- create OracleAuth(oracleAddress: oracleAddress)
    }
    
    // Create a new escrow
    pub fun createEscrow(
        docId: String,
        recipient: Address,
        requiredSigners: [String],
        vault: @FungibleToken.Vault,
        expiresAt: UFix64?
    ): @Escrow {
        let amount = vault.balance
        let payer = getCurrentBlock().timestamp  // Get from context
        
        let escrow <- create Escrow(
            docId: docId,
            amount: amount,
            payer: payer,  // Should be transaction signer
            recipient: recipient,
            requiredSigners: requiredSigners,
            vault: <- vault,
            expiresAt: expiresAt
        )
        
        emit EscrowCreated(
            docId: docId,
            amount: amount,
            payer: payer,
            recipient: recipient,
            requiredSigners: requiredSigners
        )
        
        return <- escrow
    }
    
    // Oracle verification functions (simplified - integrate with Axelar)
    pub fun verifyOracleRelease(proof: String, docId: String): Bool {
        // Verify proof came from authorized oracle
        // Check Filecoin signature completion
        // This would integrate with Axelar GMP message verification
        return true  // Placeholder
    }
    
    pub fun verifyOracleSignature(proof: String, docId: String, signer: String): Bool {
        // Verify signature came from Filecoin
        return true  // Placeholder
    }
    
    // Get escrow status
    pub fun getEscrowStatus(docId: String): EscrowStatus? {
        if let escrow <- self.escrows.remove(key: docId) {
            let status = EscrowStatus(
                docId: escrow.docId,
                amount: escrow.amount,
                isFullySigned: escrow.isFullySigned(),
                isReleased: escrow.isReleased,
                signedCount: escrow.signedAddresses.length,
                requiredCount: escrow.requiredSigners.length
            )
            self.escrows[docId] <-! escrow
            return status
        }
        return nil
    }
    
    // Struct for public status
    pub struct EscrowStatus {
        pub let docId: String
        pub let amount: UFix64
        pub let isFullySigned: Bool
        pub let isReleased: Bool
        pub let signedCount: Int
        pub let requiredCount: Int
        
        init(
            docId: String,
            amount: UFix64,
            isFullySigned: Bool,
            isReleased: Bool,
            signedCount: Int,
            requiredCount: Int
        ) {
            self.docId = docId
            self.amount = amount
            self.isFullySigned = isFullySigned
            self.isReleased = isReleased
            self.signedCount = signedCount
            self.requiredCount = requiredCount
        }
    }
}
```

### Step 2.2: Create Payroll Streaming Contract

**File:** `[packages/flow/contracts/FilosignPayroll.cdc](packages/flow/contracts/FilosignPayroll.cdc)`

```cadence
import FungibleToken from "./FungibleToken.cdc"
import FiatToken from "./FiatToken.cdc"

pub contract FilosignPayroll {
    
    // Streaming payment resource
    pub resource Stream {
        pub let streamId: String        // Unique stream ID
        pub let docId: String           // Linked document
        pub let recipient: Address      // Who receives payments
        pub let payer: Address          // Who funds the stream
        pub let ratePerSecond: UFix64   // Payment rate
        pub let totalAmount: UFix64     // Total to be paid
        pub var withdrawnAmount: UFix64 // Already withdrawn
        pub let startTime: UFix64       // When stream starts
        pub let endTime: UFix64         // When stream ends
        pub var isActive: Bool
        
        access(self) let vault: @FungibleToken.Vault
        
        init(
            streamId: String,
            docId: String,
            recipient: Address,
            payer: Address,
            ratePerSecond: UFix64,
            totalAmount: UFix64,
            startTime: UFix64,
            endTime: UFix64,
            vault: @FungibleToken.Vault
        ) {
            self.streamId = streamId
            self.docId = docId
            self.recipient = recipient
            self.payer = payer
            self.ratePerSecond = ratePerSecond
            self.totalAmount = totalAmount
            self.withdrawnAmount = 0.0
            self.startTime = startTime
            self.endTime = endTime
            self.isActive = false  // Activated by oracle when doc signed
            self.vault <- vault
        }
        
        // Calculate available amount to withdraw
        pub fun availableBalance(): UFix64 {
            if !self.isActive {
                return 0.0
            }
            
            let currentTime = getCurrentBlock().timestamp
            let effectiveTime = currentTime > self.endTime ? self.endTime : currentTime
            let elapsed = effectiveTime - self.startTime
            
            let earned = self.ratePerSecond * UFix64(elapsed)
            let available = earned - self.withdrawnAmount
            
            return available > self.totalAmount ? self.totalAmount : available
        }
        
        // Withdraw accumulated funds
        pub fun withdraw(amount: UFix64): @FungibleToken.Vault {
            let available = self.availableBalance()
            assert(amount <= available, message: "Insufficient available balance")
            
            self.withdrawnAmount = self.withdrawnAmount + amount
            return <- self.vault.withdraw(amount: amount)
        }
        
        // Activate stream (called by oracle when doc signed)
        pub fun activate(oracleProof: String) {
            assert(
                FilosignPayroll.verifyOracleActivation(oracleProof, self.docId),
                message: "Invalid activation proof"
            )
            self.isActive = true
        }
        
        destroy() {
            destroy self.vault
        }
    }
    
    // Storage
    pub var streams: @{String: Stream}
    
    // Events
    pub event StreamCreated(
        streamId: String,
        docId: String,
        recipient: Address,
        totalAmount: UFix64,
        ratePerSecond: UFix64
    )
    
    pub event StreamActivated(streamId: String, docId: String, timestamp: UFix64)
    pub event Withdrawal(streamId: String, recipient: Address, amount: UFix64)
    
    init() {
        self.streams <- {}
    }
    
    // Create a new payment stream
    pub fun createStream(
        streamId: String,
        docId: String,
        recipient: Address,
        ratePerSecond: UFix64,
        duration: UFix64,  // in seconds
        vault: @FungibleToken.Vault
    ): @Stream {
        let totalAmount = vault.balance
        let startTime = getCurrentBlock().timestamp
        let endTime = startTime + UInt64(duration)
        
        let stream <- create Stream(
            streamId: streamId,
            docId: docId,
            recipient: recipient,
            payer: getCurrentBlock().timestamp,  // From signer
            ratePerSecond: ratePerSecond,
            totalAmount: totalAmount,
            startTime: startTime,
            endTime: endTime,
            vault: <- vault
        )
        
        emit StreamCreated(
            streamId: streamId,
            docId: docId,
            recipient: recipient,
            totalAmount: totalAmount,
            ratePerSecond: ratePerSecond
        )
        
        return <- stream
    }
    
    // Oracle verification
    pub fun verifyOracleActivation(proof: String, docId: String): Bool {
        // Verify document fully signed on Filecoin
        return true  // Placeholder
    }
    
    // Get stream info
    pub fun getStream(streamId: String): StreamInfo? {
        if let stream <- self.streams.remove(key: streamId) {
            let info = StreamInfo(
                streamId: stream.streamId,
                docId: stream.docId,
                recipient: stream.recipient,
                totalAmount: stream.totalAmount,
                withdrawnAmount: stream.withdrawnAmount,
                availableNow: stream.availableBalance(),
                isActive: stream.isActive,
                startTime: stream.startTime,
                endTime: stream.endTime
            )
            self.streams[streamId] <-! stream
            return info
        }
        return nil
    }
    
    pub struct StreamInfo {
        pub let streamId: String
        pub let docId: String
        pub let recipient: Address
        pub let totalAmount: UFix64
        pub let withdrawnAmount: UFix64
        pub let availableNow: UFix64
        pub let isActive: Bool
        pub let startTime: UFix64
        pub let endTime: UFix64
        
        init(
            streamId: String,
            docId: String,
            recipient: Address,
            totalAmount: UFix64,
            withdrawnAmount: UFix64,
            availableNow: UFix64,
            isActive: Bool,
            startTime: UFix64,
            endTime: UFix64
        ) {
            self.streamId = streamId
            self.docId = docId
            self.recipient = recipient
            self.totalAmount = totalAmount
            self.withdrawnAmount = withdrawnAmount
            self.availableNow = availableNow
            self.isActive = isActive
            self.startTime = startTime
            self.endTime = endTime
        }
    }
}
```

---

## Phase 3: Backend Indexer Oracle

### Step 3.1: Extend Indexer with Flow Integration

**File:** `[packages/server/lib/indexer/flow-oracle.ts](packages/server/lib/indexer/flow-oracle.ts)` (new)

```typescript
import { ethers } from "ethers";
import * as fcl from "@onflow/fcl";

interface FlowOracleConfig {
    flowAccessNode: string;
    escrowContractAddress: string;
    payrollContractAddress: string;
    oraclePrivateKey: string;
    axelarGatewayAddress: string;
}

export class FlowOracle {
    private config: FlowOracleConfig;
    
    constructor(config: FlowOracleConfig) {
        this.config = config;
        
        // Configure FCL
        fcl.config()
            .put("accessNode.api", config.flowAccessNode)
            .put("challenge.handshake", config.flowAccessNode)
            .put("0xFilosignEscrow", config.escrowContractAddress)
            .put("0xFilosignPayroll", config.payrollContractAddress);
    }
    
    /**
     * Called when indexer detects all signatures complete
     */
    async handleDocumentFullySigned(
        docId: string,
        signatures: string[],
        paymentConfig: {
            type: "escrow" | "stream";
            flowRecipient: string;
            amount?: string;
            streamId?: string;
        }
    ): Promise<{ success: boolean; txId?: string; error?: string }> {
        try {
            // Generate oracle proof
            const proof = this.generateOracleProof(docId, signatures);
            
            if (paymentConfig.type === "escrow") {
                return await this.releaseEscrow(docId, proof);
            } else if (paymentConfig.type === "stream") {
                return await this.activateStream(paymentConfig.streamId!, proof);
            }
            
            return { success: false, error: "Unknown payment type" };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : "Unknown error" 
            };
        }
    }
    
    private generateOracleProof(docId: string, signatures: string[]): string {
        // Create cryptographic proof that document is signed
        // This would be verified by the Cadence contract
        const message = ethers.keccak256(
            ethers.toUtf8Bytes(`${docId}:${signatures.join(",")}`)
        );
        
        // Sign with oracle private key
        const wallet = new ethers.Wallet(this.config.oraclePrivateKey);
        return wallet.signMessage(message);
    }
    
    private async releaseEscrow(docId: string, proof: string) {
        const transactionId = await fcl.mutate({
            cadence: `
                import FilosignEscrow from 0xFilosignEscrow
                
                transaction(docId: String, proof: String) {
                    let escrow: &FilosignEscrow.Escrow
                    let auth: &FilosignEscrow.OracleAuth
                    
                    prepare(signer: AuthAccount) {
                        self.escrow = signer.borrow<&FilosignEscrow.Escrow>(
                            from: /storage/filosignEscrow
                        )!
                        self.auth = signer.borrow<&FilosignEscrow.OracleAuth>(
                            from: /storage/filosignOracleAuth
                        )!
                    }
                    
                    execute {
                        let funds <- self.escrow.release(oracleProof: proof, auth: self.auth)
                        // Transfer funds to recipient vault
                    }
                }
            `,
            args: (arg: any, t: any) => [
                arg(docId, t.String),
                arg(proof, t.String)
            ],
            payer: fcl.authz,
            proposer: fcl.authz,
            authorizations: [fcl.authz],
            limit: 1000
        });
        
        // Wait for seal
        const tx = await fcl.tx(transactionId).onceSealed();
        
        return { success: tx.status === 4, txId: transactionId };
    }
    
    private async activateStream(streamId: string, proof: string) {
        // Similar to escrow but calls activate() on stream
        const transactionId = await fcl.mutate({
            cadence: `
                import FilosignPayroll from 0xFilosignPayroll
                
                transaction(streamId: String, proof: String) {
                    let stream: &FilosignPayroll.Stream
                    
                    prepare(signer: AuthAccount) {
                        self.stream = signer.borrow<&FilosignPayroll.Stream>(
                            from: /storage/filosignStreams[streamId]
                        )!
                    }
                    
                    execute {
                        self.stream.activate(oracleProof: proof)
                    }
                }
            `,
            args: (arg: any, t: any) => [
                arg(streamId, t.String),
                arg(proof, t.String)
            ],
            limit: 1000
        });
        
        const tx = await fcl.tx(transactionId).onceSealed();
        return { success: tx.status === 4, txId: transactionId };
    }
}
```

### Step 3.2: Update Indexer Processor

**Modified File:** `[packages/server/lib/indexer/process.ts](packages/server/lib/indexer/process.ts)`

```typescript
import { FlowOracle } from "./flow-oracle";

// Add to existing indexer
export async function processFileSignedEvent(event: FileSignedEvent) {
    // ... existing processing ...
    
    // Check if this was the final signature
    const isFullySigned = await checkAllSignersCompleted(
        event.pieceCid,
        event.signer
    );
    
    if (isFullySigned) {
        // Get payment configuration from database
        const paymentConfig = await db
            .select()
            .from(filePayments)
            .where(eq(filePayments.pieceCid, event.pieceCid));
        
        if (paymentConfig && paymentConfig.flowEnabled) {
            const oracle = new FlowOracle({
                flowAccessNode: env.FLOW_ACCESS_NODE,
                escrowContractAddress: env.FILOSIGN_ESCROW_ADDRESS,
                payrollContractAddress: env.FILOSIGN_PAYROLL_ADDRESS,
                oraclePrivateKey: env.FLOW_ORACLE_PRIVATE_KEY,
                axelarGatewayAddress: env.AXELAR_GATEWAY_ADDRESS,
            });
            
            const result = await oracle.handleDocumentFullySigned(
                event.pieceCid,
                await getAllSignatures(event.pieceCid),
                {
                    type: paymentConfig.paymentType, // "escrow" | "stream"
                    flowRecipient: paymentConfig.flowRecipientAddress,
                    amount: paymentConfig.amount,
                    streamId: paymentConfig.flowStreamId,
                }
            );
            
            if (result.success) {
                await db
                    .update(filePayments)
                    .set({
                        status: "released",
                        flowTxId: result.txId,
                        releasedAt: new Date(),
                    })
                    .where(eq(filePayments.pieceCid, event.pieceCid));
            } else {
                // Log failure for retry
                console.error("Flow release failed:", result.error);
            }
        }
    }
}
```

### Step 3.3: Database Schema for Payments

**Modified File:** `[packages/server/lib/db/schema/file.ts](packages/server/lib/db/schema/file.ts)`

```typescript
// Add to existing file.ts

export const filePayments = t.pgTable(
    "file_payments",
    {
        id: t.text().primaryKey().default(sql`gen_random_uuid()`),
        pieceCid: t
            .text()
            .notNull()
            .references(() => files.pieceCid),
        
        // Payment configuration
        flowEnabled: t.boolean().notNull().default(false),
        paymentType: t.text({ enum: ["escrow", "stream", "none"] }).default("none"),
        
        // Escrow details
        amount: t.text(),  // USDC amount in smallest unit
        flowRecipientAddress: t.text(),  // Flow address (0x...)
        
        // Stream details
        flowStreamId: t.text(),
        streamRatePerSecond: t.text(),
        streamDuration: t.integer(),  // seconds
        
        // Status tracking
        status: t.text({ enum: ["pending", "funded", "active", "released", "failed"] })
            .default("pending"),
        flowTxId: t.text(),
        fundedAt: t.timestamp(),
        releasedAt: t.timestamp(),
        
        ...timestamps,
    },
    (table) => [
        t.index("idx_file_payments_piece_cid").on(table.pieceCid),
        t.index("idx_file_payments_status").on(table.status),
    ]
);
```

---

## Phase 4: Frontend Integration

### Step 4.1: Create Payment Setup Component

**File:** `[packages/client/src/pages/dashboard/envelope/create/_components/PaymentSetup.tsx](packages/client/src/pages/dashboard/envelope/create/_components/PaymentSetup.tsx)` (new)

```typescript
import { useState } from "react";
import { useFilosignContext } from "@/lib/context/filosign-provider";

interface PaymentSetupProps {
    onSetup: (config: PaymentConfig) => void;
}

export interface PaymentConfig {
    enabled: boolean;
    type: "escrow" | "stream";
    amount: string;  // USDC amount
    flowRecipient: string;  // Flow address
    // Stream-specific
    duration?: number;  // days
}

export function PaymentSetup({ onSetup }: PaymentSetupProps) {
    const { wallet } = useFilosignContext();
    const [config, setConfig] = useState<PaymentConfig>({
        enabled: false,
        type: "escrow",
        amount: "",
        flowRecipient: "",
    });
    
    const handleSubmit = () => {
        if (config.enabled && config.amount && config.flowRecipient) {
            onSetup(config);
        }
    };
    
    return (
        <div className="payment-setup">
            <h3>Automated Payment (Flow Blockchain)</h3>
            
            <label>
                <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                />
                Enable automatic payment on signature completion
            </label>
            
            {config.enabled && (
                <>
                    <select
                        value={config.type}
                        onChange={(e) => setConfig({ ...config, type: e.target.value as any })}
                    >
                        <option value="escrow">One-time Escrow</option>
                        <option value="stream">Streaming Payroll</option>
                    </select>
                    
                    <input
                        type="text"
                        placeholder="USDC Amount"
                        value={config.amount}
                        onChange={(e) => setConfig({ ...config, amount: e.target.value })}
                    />
                    
                    <input
                        type="text"
                        placeholder="Recipient Flow Address (0x...)"
                        value={config.flowRecipient}
                        onChange={(e) => setConfig({ ...config, flowRecipient: e.target.value })}
                    />
                    
                    {config.type === "stream" && (
                        <input
                            type="number"
                            placeholder="Duration (days)"
                            onChange={(e) => setConfig({ 
                                ...config, 
                                duration: parseInt(e.target.value) 
                            })}
                        />
                    )}
                    
                    <button onClick={handleSubmit}>
                        Configure Payment
                    </button>
                </>
            )}
        </div>
    );
}
```

### Step 4.2: Add Payment to Document Creation Flow

**Modified File:** Integrate into existing document creation hook

```typescript
// In useSendFile.ts or similar
import { PaymentConfig } from "../components/PaymentSetup";

async function createDocumentWithPayment(
    documentData: DocumentData,
    paymentConfig?: PaymentConfig
) {
    // 1. Create document on Filecoin (existing flow)
    const docResult = await createDocument(documentData);
    
    // 2. If payment enabled, create escrow/stream on Flow
    if (paymentConfig?.enabled) {
        const paymentResult = await api.rpc.postSafe(
            { escrowId: z.string() },
            "/payments/setup",
            {
                pieceCid: docResult.pieceCid,
                type: paymentConfig.type,
                amount: paymentConfig.amount,
                flowRecipient: paymentConfig.flowRecipient,
                duration: paymentConfig.duration,
            }
        );
        
        // 3. User funds the escrow (redirect to Flow wallet)
        if (paymentResult.success) {
            await fundEscrowOnFlow(paymentResult.data.escrowId, paymentConfig.amount);
        }
    }
}
```

---

## Phase 5: Testing & Deployment

### Step 5.1: Local Testing

**Script:** `[packages/flow/scripts/test-local.sh](packages/flow/scripts/test-local.sh)`

```bash
#!/bin/bash
set -e

echo "Starting Flow emulator..."
flow emulator start &
EMULATOR_PID=$!
sleep 3

echo "Deploying contracts..."
flow project deploy --network emulator

echo "Running tests..."
flow test

echo "Stopping emulator..."
kill $EMULATOR_PID

echo "Local test complete!"
```

### Step 5.2: Testnet Deployment

```bash
# 1. Create testnet account
flow accounts create --network testnet

# 2. Fund with test FLOW
echo "Visit https://faucet.flow.com/ to fund your testnet account"

# 3. Deploy contracts
flow project deploy --network testnet

# 4. Test end-to-end
# - Create document on Filecoin Calibration
# - Set up escrow on Flow Testnet
# - Sign document
# - Verify automatic release
```

### Step 5.3: Mainnet Deployment Checklist

- Security audit of Cadence contracts
- Oracle key management (secure storage)
- Axelar GMP integration testing
- USDC liquidity verification
- Fallback mechanisms for failed releases
- Monitoring and alerting setup

---

## Summary

**Total Implementation Time**: 4-6 weeks
**Team Size**: 2 developers (1 Cadence/Solidity, 1 Backend/Frontend)
**Key Milestones**:


| Week | Milestone                              |
| ---- | -------------------------------------- |
| 1    | Flow contracts deployed to emulator    |
| 2    | Oracle service integrated with indexer |
| 3    | Frontend payment UI complete           |
| 4    | Testnet end-to-end testing             |
| 5    | Security audit & fixes                 |
| 6    | Mainnet deployment                     |


**Files Created**: ~15 new files across packages
**Files Modified**: ~5 existing files (indexer, schema, hooks)