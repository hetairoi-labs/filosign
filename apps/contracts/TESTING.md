# Contract tests

Concise rules for `apps/contracts` Hardhat tests. Humans: see also [README.md](./README.md).

## Run

```bash
bun run --cwd apps/contracts test        # compile + hardhat test
bun run --cwd apps/contracts check-types # tsc --noEmit
```

`test` runs `compile` first (interfaces + Solidity), then `hardhat test`.

**Deploy / migrate:** `migrate`, `migrate:testnet`, and `migrate:mainnet` run `**test` before `deploy`**. If the suite fails, deploy does not run.

Direct `**bun run deploy**` does not run tests; use `**migrate**` / `**migrate:***` for gated deploy, or run `bun run test` yourself first.

## Philosophy

This stack is **Hardhat + viem + TypeScript**, not Foundry. Keep the same *intent* as [ETHSKILLS — Testing](https://raw.githubusercontent.com/austintgriffith/ethskills/refs/heads/master/testing/SKILL.md) ([overview](https://ethskills.com/SKILL.md)):

- **Test what loses money or breaks trust** — access control, reverts on bad inputs, signature and expiry paths, escrow ↔ registry accounting, pause flags. Skip tautologies (e.g. proving a trivial getter returns the constructor arg) and **do not** re-test OpenZeppelin internals.
- **Prefer properties over mirroring implementation** — after refunds, releases, or attaches, **balances and invariants** should match expectations; asserting only that storage equals what you set is weak if it repeats the implementation.
- **Exercise edge cases** — zero amounts, caps, blacklists, unsorted commitments, wrong nonces, expired signatures, unauthorized `onlyServer` / `onlyManager` callers, boundary inputs where relevant.
- **Fuzz and long sequences** — Foundry fuzzes parameters natively; in TS use table-driven or bounded-random inputs for math and sizes. For multi-step flows, reuse invariant-style checks (e.g. `assertEscrowBalanced`) after sequences.
- **Fork tests** — If code depends on **live** external protocols or oracles, validate on a pinned fork with real state; default Filosign tests stay on Hardhat Network fixtures.
- **Static analysis** — Before shipping risky Solidity, run tools such as Slither; treat high/medium findings as blockers unless explicitly accepted.

## Layout


| Path                            | Role                                                            |
| ------------------------------- | --------------------------------------------------------------- |
| `test/*.spec.ts`                | Behavior: reverts, balances, integration                        |
| `test/fixtures.ts`              | Deploy factories, `registerFileAndAttach`, multi-signer helpers |
| `test/helpers/signatures.ts`    | EIP-712 signing (must match on-chain domain/types)              |
| `test/helpers/walletAccount.ts` | Account helpers for viem clients                                |
| `test/helpers/chainTime.ts`     | `latestBlockTimestamp(publicClient)`                            |
| `test/helpers/invariants.ts`    | Escrow / fee checks where used                                  |


## Non-negotiables

1. **Chain time** — Any field the contract compares to `block.timestamp` (e.g. registry signature validity, ERC-20 permit `deadline`) must use `**latestBlockTimestamp(publicClient)`**, not `Date.now()` / `Math.floor(Date.now()/1000)`.
2. **Viem `.read` args** — For a single Solidity parameter of type `bytes32[]`, pass **one** tuple element that *is* the array: `read.computeEmailSignerCommitment([commitments])`. Passing a bare `Hex[]` with length 2 makes viem encode **two** ABI arguments → `AbiEncodingLengthMismatchError`.
3. **Hex fixtures** — `bytes32`-sized literals must be **valid hex** (`0-9a-f`). Invalid nibbles produce opaque RPC errors.
4. **Definitions** — Do not hand-edit `definitions/`. Updated by **deploy**, not by `compile` alone. See repo `[.cursor/rules/app.mdc](../../.cursor/rules/app.mdc)`.

## Adding tests

- Reuse `fixtures.ts` for deploy + registration paths; add helpers when the second copy would appear.
- Keep typed data and domain aligned with Solidity (`signatures.ts` and contract constants).
- Prefer asserting **exact revert behavior** and **balances / invariants** for fund flows, not only “does not throw.”

## Solidity changes

For behavioral or security-sensitive edits, add or update tests **in the same change** (test-first or immediately alongside). Follow [ETHSKILLS Testing](https://raw.githubusercontent.com/austintgriffith/ethskills/refs/heads/master/testing/SKILL.md) and secure-contracts guidance for on-chain work.

## Before merge / deploy

- Custom or economic logic has tests for **failure modes** and **edges**, not only the happy path.
- Access control: unauthorized callers revert where expected.
- Fund flows: escrow and fee semantics covered with explicit balances or shared invariant helpers where applicable.
- `bun run --cwd apps/contracts test` and `check-types` are green; required CI workflow passes.

## CI

Workflow: `[.github/workflows/contracts.yml](../../.github/workflows/contracts.yml)` runs `bun run test` and `check-types` on pull requests and on push to `main` / `master`. Enable it as a **required status** on your default branch in GitHub settings.

PR template: `[.github/PULL_REQUEST_TEMPLATE.md](../../.github/PULL_REQUEST_TEMPLATE.md)` includes a contracts checklist.