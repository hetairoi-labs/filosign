# @filosign/server

Hono API, Drizzle/Postgres, Privy, S3, and chain/indexer helpers for Filosign.

## Run

- Local: `bun run dev:local` (loads `.env.local`)
- Staging/testnet profile: `bun run dev:testnet` (loads `.env.staging`)

Bun reads `.env*` automatically per [environment variables — Bun](https://bun.com/docs/runtime/environment-variables); workspace scripts pin files with **`--env-file`** for predictable local/staging.

## Structure

| Path | Role |
|------|------|
| `api/orpc/` | oRPC **`/api/rpc`** + OpenAPI **`/api/api-reference`** (see `hono-mount.ts`, `router.ts`) |
| `api/handlers/` | oRPC procedure implementations (**`ORPCError`**, reuse `tryCatch`) |
| `api/routes/` | Thin Hono apps mounted from `api/routes/router.ts` ( **`GET /runtime`**, multipart **avatar**) |
| `api/routes/users/` | **`avatar-route.ts`** only — **`PUT /profile/avatar`** under `/api/users` |
| `api/middleware/` | `optionalJwtWalletForOrpc` + `authenticated` (JWT → `ctx.var.userWallet`) |
| `lib/domain/` | Cross-cutting domain logic (oRPC handlers + indexer), e.g. sharing invites, file-invite helpers |
| `lib/indexer/` | `processTransaction` — replays receipts into DB |
| `lib/validation/` | E.g. `tx-registration.ts` — Zod schemas shared with indexer / RPC |
| `lib/polyfills/` | `bigint-json` for JSON serialization |
| `constants.ts` | Shared limits (e.g. `MAX_FILE_SIZE`) |

## Scaling / limits

- **Auth (`auth.nonce`):** nonces are **in-process** (`Record<Address, …>`). Safe for **one server process**. For **multiple replicas**, use Redis/Postgres or redesign the Dilithium handshake.
- **`tx.processIndexerHash` input `{ hash, body? }`:** **`body: {}`** is valid for txs that only index FSManager logs; **`encryptionPublicKey` + `signaturePublicKey`** together (hex) for KeyRegistry registration. Shape is **`zIndexerTxBody`** in `lib/validation/tx-registration.ts`.

## Ops

- **`GET /health`** (root app, not under `/api`) — `{ ok: true }` for probes.
- **`bun run routes:print`** — lists mounted Hono routes (`scripts/print-routes.ts`).

## API envelope

- **`GET /api/runtime`** (Hono carve-out): `{ success, data, message }` via `respond.ok` for the SDK until callers move to **`runtime`** on **`/api/rpc`**.
- **Other APIs:** Prefer **`/api/rpc`** — native outputs + **`ORPCError`** mapping (OpenAPI explorer at **`/api/api-reference`**).

## Security notes

- **`tx.processIndexerHash`** uses **`authenticatedProcedure`** — JWT unchanged. Validates JSON server-side; **reverted** on-chain txs return **400**. Generic **500** text avoids leaking internals; see `ProcessTxUserError`.
- **`DEBUG=true`** — skips outbound Resend email (`lib/email/invites.ts`) and expands JWT indexer logs (`env.ts` drives both).

## Database

- **Drizzle** uses **`pg.Pool`** in `lib/db/client.ts`; tune **`max`** / **`idleTimeoutMillis`** for your Postgres limits.
- Push schema (dev): `bun run db:push:local` or `db:push:testnet`
- Purge (destructive): `db:purge:*` scripts

## Checks

- `bun run check` — Biome
- `bun run check-types` — TypeScript
- **`bun test`** — Zod/helpers unit tests (`lib/**/*.test.ts`)
