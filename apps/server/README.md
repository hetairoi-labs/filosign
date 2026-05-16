# @filosign/server

Hono API, Drizzle/Postgres, Privy, S3, and chain/indexer helpers for Filosign.

## Run

- Local: `bun run dev:local` (loads `.env.local`)
- Staging/testnet profile: `bun run dev:testnet` (loads `.env.staging`)

Bun reads `.env*` automatically per [environment variables — Bun](https://bun.com/docs/runtime/environment-variables); workspace scripts pin files with **`--env-file`** for predictable local/staging.

## Structure

| Path | Role |
|------|------|
| `api/routes/` | HTTP apps mounted from `api/routes/router.ts` |
| `api/routes/files/` | `upload-*`, cold-invite, register, list, **`piece/`** routers composed in `piece-routes.ts`; shared `helpers.ts` |
| `api/routes/sharing/` | `requests-routes`, `invites-routes`, `inbox-routes` composed in `index.ts` |
| `api/routes/users/` | `profile-core`, `profile-email`, `profile-registration` composed in `profile.ts` |
| `api/middleware/` | `authenticated` (JWT → `ctx.var.userWallet`; uses shared `api/factory` typing) |
| `lib/domain/` | Cross-cutting domain logic (routes + indexer), e.g. sharing invites |
| `lib/indexer/` | `processTransaction` — replays receipts into DB |
| `lib/validation/` | E.g. `tx-registration.ts` — Zod schemas shared with routes/indexer |
| `lib/polyfills/` | `bigint-json` for JSON serialization |
| `constants.ts` | Shared limits (e.g. `MAX_FILE_SIZE`) |

## Scaling / limits

- **Auth `/api/auth/nonce`:** nonces are **in-process** (`Record<Address, …>`). Safe for **one server process**. For **multiple replicas**, use Redis/Postgres or redesign the Dilithium handshake.
- **`POST /api/tx/:hash`** body: **`{}`** is valid for txs that only index FSManager logs; **`encryptionPublicKey` + `signaturePublicKey`** together (hex) for KeyRegistry registration. Shape is **`zIndexerTxBody`** in `lib/validation/tx-registration.ts`.

## Ops

- **`GET /health`** (root app, not under `/api`) — `{ ok: true }` for probes.
- **`bun run routes:print`** — lists mounted Hono routes (`scripts/print-routes.ts`).

## API envelope

- **`GET /api/runtime`** returns the same `{ success, data, message }` shape as other JSON routes (see `respond.ok`).

## Security notes

- **`POST /tx/:hash`** is behind **`authenticated`** — JWT matches other APIs. Validates JSON server-side; **reverted** on-chain txs return **400**. Generic **500** text avoids leaking internals; see `ProcessTxUserError`.
- **`DEBUG=true`** — skips outbound Resend email (`lib/email/invites.ts`) and expands JWT indexer logs (`env.ts` drives both).

## Database

- **Drizzle** uses **`pg.Pool`** in `lib/db/client.ts`; tune **`max`** / **`idleTimeoutMillis`** for your Postgres limits.
- Push schema (dev): `bun run db:push:local` or `db:push:testnet`
- Purge (destructive): `db:purge:*` scripts

## Checks

- `bun run check` — Biome
- `bun run check-types` — TypeScript
- **`bun test`** — Zod/helpers unit tests (`lib/**/*.test.ts`)
