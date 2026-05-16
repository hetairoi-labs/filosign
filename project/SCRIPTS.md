# Monorepo scripts

Two layers: **orchestrators** (`scripts/*.ts` with flags) for multi-app workflows, and **package scripts** (`dev:local`, Turbo tasks) for single commands and CI.

## Profiles

| Profile | Env file | Use |
| --- | --- | --- |
| `local` | `.env.local` | Hardhat + local API (`serloc`) |
| `testnet` | `.env.staging` | Base Sepolia + staging API (historical name) |

Apps use the same suffix: `dev:local`, `dev:testnet`.

## Daily commands

```bash
# Local stack (serloc + client)
bun run dev -- --local
bun run dev:local                    # alias

# Local + marketing site
bun run dev -- --local --full
bun run dev:local:full               # alias

# Staging / testnet (client + server)
bun run dev -- --testnet
bun run dev:testnet                  # alias

# Marketing only
bun run dev -- --astro

# Help
bun run dev -- --help
```

**serloc** (`bun run serloc`) is interactive (`r` / `R` / `q`). On `--local` it runs in parallel with the client (same terminal).

### Single app

```bash
bun run dev -- --client --local
bun run dev -- --server --testnet
bun run dev -- --astro
```

Or without the orchestrator:

```bash
bun run --cwd apps/client dev:local
bun run --cwd apps/server dev:testnet
bun run --cwd apps/astro dev:local
```

Use **`bun run --cwd <path>`** for any single package (not `bun run -F`): full logs, no `[N lines elided]`, no `@filosign/…` prefix on every line. Multi-package CI uses **Turbo** (`check-types`, `test`, `build`), not Bun’s filter.

## Database

```bash
bun run db -- push local
bun run db -- push testnet
bun run db -- purge local
bun run db -- purge testnet
bun run db -- --help
```

Server package still defines `db:push:*` / `db:purge:*`; the root `db` script runs them in `apps/server` via `--cwd`.

## Quality (CI / pre-push)

| Command | What |
| --- | --- |
| `bun run sanity:check` | Biome + Turbo `check-types` + unit tests |
| `bun run sanity:check:full` | Above + Hardhat (`apps/contracts`) |
| `bun run sanity:fix` | Biome write + types + tests |
| `bun run check` | Biome (repo root only) |
| `bun run check-types` | Turbo `check-types` (`@filosign/*`) |
| `bun run test` | Turbo `test` (excludes contracts) |
| `bun run build` | Turbo `build` |

Turbo caches `check-types`, `test`, `build`, `compile`. **Dev stacks are not in Turbo.**

## Contracts

```bash
bun run contracts:migrate              # local (Hardhat)
bun run contracts:migrate:testnet
bun run contracts:migrate:mainnet
bun run --cwd apps/contracts test
```

## Test harness

`packages/test` uses `VITE_CHAIN` instead of env files — run with `bun run test:dev` or `bun run --cwd packages/test dev`.

## Migration (old → new)

| Old | New |
| --- | --- |
| `bun run web:dev:local` | `bun run dev -- --local --full` (old included astro) or `dev:local` without astro |
| `bun run web:dev:testnet` | `bun run dev -- --testnet` |
| `bun run client:dev:local` | `bun run dev -- --client --local` or `bun run --cwd apps/client dev:local` |
| `bun run server:dev:testnet` | `bun run dev -- --server --testnet` |
| `bun run astro:dev` | `bun run dev -- --astro` |
| `bun run db:push:local` | `bun run db -- push local` |
| `bun run db:purge:testnet` | `bun run db -- purge testnet` |
| `bun run client:typecheck` | `turbo run check-types --filter=@filosign/client` |

Note: legacy `web:dev:local` ran **client + serloc + astro**. New default `dev --local` is **serloc + client** only; add `--full` for astro.
