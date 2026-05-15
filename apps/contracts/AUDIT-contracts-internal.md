# Filosign contracts — internal security review

**Scope:** Solidity under [`apps/contracts/src`](apps/contracts/src).

**Methodology:** Aligned with [AGENTS.md](AGENTS.md): **ETHSKILLS** / security posture and **`/develop-secure-contracts`** (OpenZeppelin‑first). Not a substitute for an external audit.

**Trust model:**

- **`server`** (immutable deployer of `FSManager`) is trusted but must not be compromised.
- **`treasury`** and **`FSEscrow.manager`** (`FSManager`) are immutable.
- Signers are assumed to understand what they sign (EIP‑712).

---

## Executive summary

The system is **server-gated**, with **`SafeERC20`**, **`ReentrancyGuard`**, and structured access. **`FSEscrow.deposit` / `depositWithPermit`** credit **`balances` / `totalLiabilities`** using the **vault balance delta** after each **`transferFrom`**, aligning the ledger with **tokens actually sitting in escrow** under normal transfer semantics. **`FSFileRegistry`** still stores the **nominal** incentive amount declared at attach—which can diverge from credited escrow for **fee-on-transfer** tokens; payouts may then revert until product/ops aligns registry policy with reality. **`platformFeeBps`** is applied at payout (**`settleIncentiveRelease`**) — intentional policy lever for trusted `server`. Prior hygiene removals: unused **`cidRegistry`**, **`SIGNATURE_MAX_DRIFT_PERIOD`**, **`publicKeys`** (see repo history / README).

---

## What non-standard ERC‑20 still implies

For **canonical USDC-style** behaviour, delta equals pulled amount — unchanged UX.

If a **fee-on-transfer** token were allowlisted accidentally:

1. **`attachIncentive`** records gross **100** on-chain in **`FSFileRegistry`** while escrow might credit **99** to **`balances[sender][token]`**.
2. **`settleIncentiveRelease`** still debits **`gross` 100** from the registry-driven flow → **`InsufficientBalance`** on escrow if only **99** was ever credited — **early failure** vs silent insolvency across unrelated users.

**Rebasing** tokens remain **unsupported** regardless of deltas.

### Guardrails

| Layer | Recommendation |
|--------|----------------|
| **Ops** | Keep allowlist USDC-grade only unless you consciously support more. |
| **Product** | If you list exotic tokens, align **`setSignerIncentive`** amounts with **expected received** deltas or revert attach when **`received ≠ requested`**. |

---

## Findings

| ID | Severity | Title | Location |
|----|----------|-------|----------|
| ~~F01~~ | Resolved | ~~Ledger vs received~~ → **Deposits use balance delta** | [`FSEscrow.sol`](src/FSEscrow.sol) `_pullDepositAndCredit` |
| F01b | Low / Operational | **`FSFileRegistry`** nominal **`incentiveAmount`** vs escrow **received** can diverge on non-standard ERC‑20 | [`FSManager.sol`](src/FSManager.sol) + [`FSFileRegistry.sol`](src/FSFileRegistry.sol) |
| F02 | Low / Operational | **`platformFeeBps`** applied at **`settleIncentiveRelease`**, not frozen at attach | [`FSManager.sol`](src/FSManager.sol) |

### F02 — Detail

Trusted `server` can change fee between attach and signer payout. Document for product/legal if signers must see a locked rate.

---

## Positive controls (not exhaustive)

| Area | Notes |
|------|--------|
| Reentrancy | `nonReentrant` on escrow entry points that touch ERC‑20 |
| Access | Escrow only `manager`; manager `onlyServer` / `onlyServerOrFileRegistry` as designed |
| EIP‑712 | Nonces on register/sign flows |
| Deposit integrity | **`DepositBalanceInvariantBroken`** if `balanceOf(after) < balanceOf(before)` on deposit (pathological token) |

---

## Appendix

Optional checklists: [evm-audit-master](https://raw.githubusercontent.com/austintgriffith/evm-audit-skills/main/evm-audit-master/SKILL.md).

**Tests:** [`test/platform-fee.ts`](test/platform-fee.ts); `hardhat test` under `apps/contracts`.
