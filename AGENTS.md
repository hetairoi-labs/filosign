# AGENTS.md — Filosign

LLM/agent map: **packages**, **boundaries**, **data flow**, **[skills](#skills)**. Always read `[.cursor/rules/](.cursor/rules/)`; if repo rules conflict with this doc on the same detail, **narrow rule wins** until both change.


| Rule file                                                                 | Use                                                                                                 |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [contracts-testing.mdc](.cursor/rules/contracts-testing.mdc)              | Before editing `apps/contracts/test/` or `src/*.sol` (see [TESTING.md](apps/contracts/TESTING.md)) |
| [preamble.mdc](.cursor/rules/preamble.mdc)                                | Discipline, `bun check`, `tsc`, tests                                                             |
| [apps/web/patterns.mdc](.cursor/rules/apps/web/patterns.mdc)              | `safe`/`tryCatch`, `respond`, Hono middleware, `lib/`                                               |
| [app.mdc](.cursor/rules/app.mdc)                                          | Never edit `apps/contracts/definitions/`** (generated)                                              |
| [apps/web/api-routes.mdc](.cursor/rules/apps/web/api-routes.mdc)          | Hono routes + SDK consumer pattern—see [API](#api)                                                  |


## Packages


| Path                    | npm                      | Role                                                                            |
| ----------------------- | ------------------------ | ------------------------------------------------------------------------------- |
| `apps/client`           | `@filosign/client`       | Vite UI, Privy/wagmi, Dilithium bootstrap—**thin**; logic via `@filosign/react` |
| `apps/server`           | `@filosign/server`       | Hono, Drizzle, Privy, `GET /runtime`, server `getContracts`                     |
| `apps/contracts`        | `@filosign/contracts`    | Solidity, `definitions/`, `getContracts`, EIP-712 helpers; **tests:** `apps/contracts/test/`, [TESTING.md](apps/contracts/TESTING.md)                       |
| `apps/astro`            | —                        | Marketing                                                                       |
| `packages/react-sdk`    | `@filosign/react`        | `FilosignProvider`, `ApiClient`, hooks, user-wallet chain calls                 |
| `packages/shared`       | `@filosign/shared`       | Types, Zod, manifests, commitments (browser+server)                             |
| `packages/crypto-utils` | `@filosign/crypto-utils` | KEM, crypto, cold-invite; SDK + contracts tooling                               |
| `packages/test`         | `test`                   | Dev harness                                                                     |


Root `[package.json](package.json)`: workspaces `apps/`*, `packages/*`.

## Flow

```mermaid
flowchart LR
  subgraph c [apps/contracts]
    S[.sol] --> D[definitions]
    D --> G[getContracts EIP712]
  end
  subgraph sv [apps/server]
    R["/runtime"]
    E[lib/evm.ts]
    Rt[api/routes]
  end
  subgraph sdk [packages/react-sdk]
    P[FilosignProvider]
    A[ApiClient]
    H[hooks]
  end
  subgraph cl [apps/client]
    W[wagmi WASM shell]
    PG[pages]
  end
  G --> E
  G --> P
  R --> P
  E --> Rt
  P --> A
  A --> Rt
  H --> A
  H --> P
  W --> P
  PG --> H
  sh["@filosign/shared"] --> sv
  sh --> sdk
  sh --> cl
  cr["@filosign/crypto-utils"] --> sdk
  cr --> c
```



- `getContracts({ client, chainKey })` ← `getDefinitionsEntry(chainKey)` → `[definitions/](apps/contracts/definitions/)`. Source: `[services/contracts.ts](apps/contracts/services/contracts.ts)`.
- Server: `[lib/evm.ts](apps/server/lib/evm.ts)` + `config.chainKey`.
- Browser: `[FilosignProvider.tsx](packages/react-sdk/src/context/FilosignProvider.tsx)` → `/runtime` → `chainKey` + wagmi → `getContracts`; HTTP via `[ApiClient.ts](packages/react-sdk/src/ApiClient.ts)`.
- Shell: `[filosign-provider.tsx](apps/client/src/lib/context/filosign-provider.tsx)`—WASM, `useWalletClient()`, `VITE_PLATFORM_URL`.

## Boundaries

**HTTP:** Use `useFilosignContext().api` + `@filosign/react/hooks` (`postSafe`, `getSafe`, `rpc.base`). No `fetch`/axios from `apps/client` to API **except** narrow cases: blob/doc URL bytes (`[send-envelope.ts](apps/client/src/pages/dashboard/envelope/create/add-sign/send-envelope.ts)`), static assets (`[compliance-pdf-images.ts](apps/client/src/lib/utils/compliance-pdf/compliance-pdf-images.ts)`)—no JWT API client pattern.

**Imports:** Client → minimal `@filosign/contracts` (`[constants.ts` mock-usdc](apps/client/src/constants.ts)); prefer SDK/runtime for new.

**Logic home:** UI `apps/client` | API+chain hooks `packages/react-sdk` | auth/DB/relay `apps/server`.

**Definitions:** Never hand-edit `definitions/`**; `definitions/*.ts` ABI/addresses are updated when you **deploy** (`hardhat run scripts/deploy.ts`); `bun run --cwd apps/contracts compile` only generates interfaces + Solidity artifacts. **Do not run `deploy` or `migrate*` without a green `apps/contracts` test run** — `migrate` scripts run `test` before `deploy`.

## Runtime

`[router.ts](apps/server/api/routes/router.ts)` `GET /runtime` → `chainKey`, chain, fees/treasury (`FSManager`). Browser `getContracts` uses `runtime.chainKey` + defs; matches `[config.ts](apps/server/config.ts)`.

## API

Mount in `[api/routes/router.ts](apps/server/api/routes/router.ts)`: `files/`, `users/`, `sharing/`, `auth/`, `tx/`. Handlers e.g. `[handlers/sharing.ts](apps/server/api/handlers/sharing.ts)`. Align with [apps/web/api-routes.mdc](.cursor/rules/apps/web/api-routes.mdc).

## Lib choice

`@filosign/shared` — pure cross-env logic. `@filosign/crypto-utils` — crypto/WASM-adjacent.

## Vertical slice

1. Contracts: edit `apps/contracts/src` → `compile` (only pipeline updates `definitions/`). **Follow [apps/contracts/TESTING.md](apps/contracts/TESTING.md)** for Hardhat tests; keep Solidity and tests aligned in the same PR when behavior changes.
2. Server: `apps/server/api/routes` + `fsContracts` (`[evm.ts](apps/server/lib/evm.ts)`).
3. SDK: hooks + `useFilosignContext()`.
4. Client: UI + `@filosign/react` imports only.
5. Verify: preamble + `bun check`, tsc, `bun run test`, forge when contracts change.

Scripts: `web:dev:*`, `client:dev:*`, `server:dev:*`, `contracts:migrate`, `contracts:test`, GitHub Actions workflow `contracts.yml`, `db:push:*`, `test` (`[package.json](package.json)`).

## Commits

**Only when the user explicitly asks to commit** (see user rules for full git safety).

- **Batching:** Group by **feature/domain**; keep commits **atomic**. Target **≤4–5 files per commit** (stay roughly under five unrelated paths); if a change touches more, split into logical batches (e.g. tests vs docs vs generated defs).
- **Subject line (exact pattern):** `[SPRINT OR MAJOR FEATURE] - SUBFEATURE (<domain / package>): <concise description>`
  - **Brackets:** the **initiative or sprint** you are delivering (e.g. `CONTRACT TEST SUITE`, `COLD INVITE`) — not the package shorthand (`CONTRACTS`, `CLIENT`). Put **area** in the parenthetical after `SUBFEATURE`.
  - Example: `[CONTRACT TEST SUITE] - Fixtures and helpers (apps/contracts): shared deploy, EIP-712, chain time`.
  - Counter-example (avoid): `[CONTRACTS] - …` in brackets when `CONTRACTS` is only the package — use the **sprint name** instead.

  Older example for the same pattern: `[COLD INVITE] - Claim KEM wrap (server): persist participant on cold invite claim`.

## Skills

Attach /slash skills when task fits; often `~/.agents/skills/`.


| Skill                                                                             | Repo                      | When                                                                                                                                      |
| --------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [ETHSKILLS](https://ethskills.com/SKILL.md) (local: `~/.cursor/skills/ethskills`) | `apps/contracts`, onchain | Read [https://ethskills.com/SKILL.md](https://ethskills.com/SKILL.md) and follow it before writing Solidity or shipping anything onchain. |
| `/vercel-react-best-practices`                                                    | client, react-sdk         | perf, fetch/waterfalls, bundles                                                                                                           |
| `/vercel-composition-patterns`                                                    | client                    | compound components, fewer boolean props                                                                                                  |
| `/frontend-design`                                                                | client, astro             | net-new / redesign aesthetic                                                                                                              |
| `/web-design-guidelines`                                                          | TSX UI                    | a11y/interface review (skill may fetch remote rules)                                                                                      |
| `/develop-secure-contracts`                                                       | `apps/contracts`          | `*.sol`, OZ integration                                                                                                                   |
| `/copywriting`                                                                    | astro, client             | marketing, CTA, microcopy                                                                                                                 |
| `/playwright`                                                                     | E2E                       | browser CLI flow (skill’s wrapper)                                                                                                        |


### Impeccable for frontend design if needed

[impeccable.style/docs](https://impeccable.style/docs/): `/impeccable` — styling/critique only. **Create:** craft, impeccable, shape • **Evaluate:** audit, critique • **Refine:** animate, bolder, colorize, delight, layout, overdrive, quieter, typeset • **Simplify:** adapt, clarify, distill • **Harden:** harden, onboard, optimize, polish • **System:** document, extract, live, teach. Obey [design.mdc](.cursor/rules/apps/web/design.mdc); scoped passes.

