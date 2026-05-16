# SCRIPTS.md — monorepo commands (agents)

**Source:** [`package.json`](package.json) → [`scripts/*.ts`](scripts/). Flags after `--`. Help: `bun run <script> -- --help`.

**Rules:** Multi-step → root orchestrators. One package → `bun run --cwd <path> <script>` (not `bun -F`). Boundaries/API: [AGENTS.md](AGENTS.md).

## When to run what

| Goal | Command |
| --- | --- |
| Local dev (bootstrap + server + client) | `bun run dev` or `bun run dev -- --local` |
| Local + astro | `bun run dev -- --local --full` |
| Staging (client + server) | `bun run dev -- --testnet` |
| One app | `bun run dev -- --client --local` etc. or `--cwd apps/<app> dev:local` |
| Format + types (writes files) | `bun run check` |
| CI / pre-push verify (no writes) | `bun run sanity` |
| Match sanity check step only | `bun run check -- --ci --types` |
| Autofix + unit tests | `bun run check && bun run test` |
| Full gate + Hardhat | `bun run sanity -- --full` |
| All tests | `bun run test` |
| Hardhat only | `bun run test -- --contracts` or `bun run contracts -- test` |
| Release builds | `bun run build` (+ flags) |
| DB schema push only | `bun run db -- push local\|testnet` |
| Wipe DB + re-push schema | `bun run db -- purge local\|testnet` |
| Contracts ops | `bun run contracts -- …` |
| Nuke deps | `bun run purge` then `bun install` |

**`check`** = Biome `--write` + types. **`sanity`** = `check --ci --types` (read-only) + turbo test excluding `@filosign/contracts`. **`test`** = all packages with tests (includes contracts). CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (`sanity` + parallel `contracts` job). Pre-push: `.husky/pre-push` → `sanity`.

## Entrypoints

| Key | Script | Role |
| --- | --- | --- |
| `dev` | `dev.ts` | Parallel dev stacks |
| `check` | `check.ts` | Biome + turbo `check-types` |
| `check:ci` | alias | `check -- --ci` (Biome only, no types) |
| `sanity` | `sanity.ts` | CI gate: check + fast tests |
| `test` | `test.ts` | turbo `test` |
| `build` | `build.ts` | Release builds (`--cwd`, sequential) |
| `db` | `db.ts` | Drizzle purge/push via server |
| `contracts` | `contracts.ts` | Hardhat + deploy/migrate |
| `purge` | `shell/purge.sh` | rm all `node_modules` + `bun.lock` |

**Env profiles:** `local` → `.env.local` · `testnet` → `.env.staging` (package scripts: `dev:local`, `db:push:local`, …).

## `dev`

`dev` / `--local` → node + compile + deploy + db purge/push, then server + client · `--local --full` → + astro · `--testnet` → client + server (no bootstrap) · `--client --local` → Vite only · `--server --local` → bootstrap + API.

Harness: `bun run --cwd packages/test dev` (`VITE_CHAIN`, not env files).

## `check`

Default: `biome check --write .` + `turbo check-types --filter=@filosign/*`.

| Flag | Effect |
| --- | --- |
| `--ci` | Biome read-only (no types unless combined) |
| `--types` | turbo `check-types`; scope: `--server`, `server`, … |
| `--ci --types` | sanity’s check step |

Biome = whole repo; scope args affect **`--types` only**. Pipeline must not use default `check` (writes). Local: `check` → commit → `sanity`.

## `sanity`

Default: `check --ci --types` → turbo `test` (`@filosign/*` \ `!@filosign/contracts`).

`--full` → + `contracts -- test` · `--check` · `--test` [scope → `test` orchestrator] · `--contracts` (Hardhat only).

## `test`

`bun run test` → all `@filosign/*` with a test script. Scope: `--client`, `--server`, `--shared`, `--crypto` / `--crypto-utils`, `--react` / `--react-sdk`, `--contracts`.

Turbo runs `^check-types` first (dependency typecheck before scoped test is expected).

## `build`

Default order: crypto wasm → client → astro → server `compile` → harness → contracts `compile`.

Flags: `--crypto`, `--client`, `--astro`, `--server`, `--harness` (`--test`), `--contracts`, `--react` (not ready). Not `turbo run build`.

## `db`

`push` + `local|testnet` — drizzle push only.

`purge` + `local|testnet` — clear schema (`db:purge:*`), then **push** automatically.

## `contracts`

`compile` · `test` (compile + Hardhat) · `node` · `--deploy --local|testnet|mainnet` · `--migrate …`

Local deploy uses `deploy:local` (`--network localhost` + `.env.local`).

| Mode | DB |
| --- | --- |
| deploy | — |
| migrate | local/testnet: `db purge` (includes push) after deploy |

Env: `local` / `testnet` / `mainnet` → `.env.local` / `.env.staging` / `.env.production`. Never hand-edit `definitions/` (deploy only). Test before testnet/mainnet deploy/migrate.

## Turbo

`check-types` + `test` → turbo via orchestrators. Release `build` → root `build.ts`. Dev servers not in turbo. Cache: `.turbo/`.

## Agent reminders

1. Default **`check` writes**; **`sanity`/CI read-only**.
2. **`--cwd`**, not `-F`.
3. Contracts: test before deploy/migrate; no manual `definitions/`.
