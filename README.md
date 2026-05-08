# FiloSign

FiloSign is a wallet-native document signing platform for encrypted agreements, verifiable signing records, and permissioned document sharing.

It lets users send documents, invite recipients, collect signatures, and export proof records while keeping document contents encrypted client-side. The repository is a Bun monorepo containing the web app, API server, React SDK, cryptography utilities, shared schemas, and Solidity contracts.

## What FiloSign Does

- Creates encrypted document envelopes for signing workflows.
- Uses wallet-backed accounts with app-level signing keys.
- Lets recipients approve who can send them documents.
- Registers document and signature state through smart contracts.
- Supports acknowledgements, signer records, and compliance exports.
- Supports optional ERC-20 signer incentives for wallet-native workflows.
- Provides a React SDK for apps that want to integrate FiloSign flows.

## Repository Structure

```text
packages/
  client/             React web app
  server/             Hono API server
  contracts/          Solidity contracts and deployment helpers
  lib/react-sdk/      React provider, API client, and hooks
  lib/crypto-utils/   Encryption, KEM, signatures, hashing, encoding
  lib/shared/         Shared schemas and helpers
test/                 Local SDK/protocol test harness
docs/                 Product and marketing notes
```

## Architecture

FiloSign has five main layers:

- **Client app:** React 19, TanStack Router, TanStack Query, Privy, Wagmi, Viem, Tailwind, Radix UI, and Motion.
- **API server:** Bun + Hono service for auth, users, files, sharing, uploads, indexing, and server-side protocol actions.
- **React SDK:** Hooks and provider logic for authentication, file workflows, sharing approvals, signing, and profiles.
- **Contracts:** Protocol contracts for sender approvals, key registration, file registration, signer records, and incentive escrow.
- **Crypto/shared libraries:** ML-KEM/Kyber, Dilithium, AES-GCM, stable encoding, Zod schemas, and EVM helpers.

## Core Workflow

1. A user connects a wallet and completes FiloSign onboarding.
2. The app derives local signing/encryption key material from wallet-backed registration data and on-chain salts, then encrypts the local seed with the user's PIN.
3. A sender requests permission to send documents to a recipient wallet.
4. The recipient approves the sender.
5. The sender creates an envelope, places fields, encrypts the document, uploads it, and registers it.
6. Recipients acknowledge, decrypt locally, sign, and produce verifiable signing records.
7. The workflow can export a proof/compliance record for review.

## Packages

### `@filosign/client`

The main web application: landing pages, onboarding, dashboard, document creation, signing, permissions, connections, profile settings, and waitlist UI.

### `@filosign/server`

The API service: wallet authentication, user registration, file upload and retrieval, document registration, signing, sharing permissions, waitlist, World ID context, and transaction indexing.

### `@filosign/contracts`

Solidity contracts and deployment utilities for local, testnet, and mainnet environments.

### `@filosign/react`

The SDK consumed by the client and test app. It wraps the API client, contract setup, TanStack Query hooks, auth, files, sharing, users, and incentives.

### `@filosign/crypto-utils`

Cross-runtime cryptographic utilities for key derivation, ML-KEM/Kyber, Dilithium, AES-GCM, hashing, and stable data encoding.

### `@filosign/shared`

Shared validation schemas and product data helpers.

## Requirements

- Bun `>= 1.3.11`
- Node.js `>= 24`
- Postgres
- S3-compatible object storage
- EVM private keys for protocol transactions and storage flows
- Privy app ID

## Setup

Install dependencies:

```bash
bun install
```

Push the database schema:

```bash
bun run db:push
```

Run the web app and API together:

```bash
bun run web:dev
```

Run services individually:

```bash
bun run client:dev
bun run server:dev
```

Run the local test harness:

```bash
bun run test:dev
```

## Environment

Server configuration is defined in `packages/server/env.ts`. The main required values are:

- `CHAIN`
- `FRONTEND_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `PG_URI`
- `DB_NAME`
- `EVM_PRIVATE_KEY_SERVER`
- `EVM_PRIVATE_KEY_SYNAPSE`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `S3_ENDPOINT`
- `SUPER_PASS`
- `WORLD_ID_RP_ID`
- `WORLD_ID_SIGNING_KEY`
- `TG_ANALYTICS_BOT_GROUP_ID`
- `TG_ANALYTICS_BOT_TOKEN`

Client configuration includes:

- `BUN_PUBLIC_PLATFORM_URL`
- `BUN_PUBLIC_PRIVY_APP_ID`
- `BUN_PUBLIC_CHAIN`

## Common Scripts

| Command | Description |
| --- | --- |
| `bun run web:dev` | Run client and server together. |
| `bun run client:dev` | Start the client dev server. |
| `bun run client:build` | Build the client. |
| `bun run server:dev` | Start the API server with hot reload. |
| `bun run server:start` | Start the API server. |
| `bun run server:compile` | Compile the API server to a Bun binary. |
| `bun run db:push` | Push the Drizzle schema. |
| `bun run db:purge` | Clear local database data. |
| `bun run test:dev` | Start the SDK/protocol test harness. |
| `bun run check` | Run Biome checks and formatting. |

## Contracts

Run a local Hardhat node:

```bash
bun run --cwd packages/contracts localnode
```

Compile contracts:

```bash
bun run --cwd packages/contracts compile
```

Deploy contracts:

```bash
bun run --cwd packages/contracts migrate
```

Deploy to Base Sepolia or Base:

```bash
bun run --cwd packages/contracts migrate:testnet
bun run --cwd packages/contracts migrate:mainnet
```

## Security Model

- Documents are encrypted in the browser before upload.
- The API stores encrypted files and encrypted key envelopes, not plaintext document keys.
- Recipients must acknowledge documents before receiving their encrypted key envelope.
- Protocol actions are authorized with wallet signatures and verified server-side before contract writes.
- Signing flows include application-level cryptographic signatures and on-chain state updates.

## Status

FiloSign is under active development. Some product areas, operational flows, marketing pages, and production hardening work are still evolving.

## License

No license file is currently present. Add a license before publishing as open source.
