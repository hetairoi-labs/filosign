# Branch feature diff: `main-29-mar-polar-works` vs `consumer-v1`

This document summarizes **feature/behavior differences** that are present in `main-29-mar-polar-works` but not in the current branch `consumer-v1` (HEAD at time of writing).

## Present in `main-29-mar-polar-works` (missing from `consumer-v1`)

### Payments / subscriptions (Polar) integration

- **New server API routes** in `packages/server/api/routes/payments/index.ts`
  - `**POST /payments/checkout/create`** (auth required)
    - Creates a Polar checkout for the logged-in wallet.
    - Blocks checkout creation if the user is already `premium`.
  - `**POST /payments/webhooks`** (public)
    - Validates Polar webhook signatures.
    - Syncs `users.subscriptionStatus`, `users.subscriptionId`, and `users.subscriptionExpiry` based on subscription events.
- **New server utility** `packages/server/lib/utils/polar.ts`
  - Instantiates the Polar SDK client.
- **Server env validation refactor** in `packages/server/env.ts`
  - Moves from “required keys list” to a **Zod schema** parse with typed env.
  - Adds new required env vars:
    - `POLAR_ACCESS_TOKEN`
    - `POLAR_MODE` (`sandbox` | `production`)
    - `POLAR_SUCCESS_URL`
    - `POLAR_WEBHOOK_SECRET`
    - `POLAR_PRODUCT_ID`
- **New React SDK payments hook** in `packages/lib/react-sdk/src/hooks/payments/`
  - `useCreateCheckout()` calls `payments/checkout/create` and returns `{ checkoutId, checkoutUrl }`.

### Supporting structural/tooling changes (likely behavior-impacting)

- **Router surface changes**
  - Adds `packages/server/api/routes/router.js` (and also modifies `router.ts`).
- **Dependency/tooling updates**
  - Multiple commits update dependencies and scripts; expect changes in:
    - `package.json`
    - `bun.lock`
    - scripts like `scripts/purge.sh`

## Notable removals in `main-29-mar-polar-works` (present on `consumer-v1`)

These are not “missing features in `consumer-v1`”, but they are **differences** where `main-29-mar-polar-works` removes or drops functionality/files that still exist on `consumer-v1`.

- **World/IDKit-related client + tests removed**
  - E.g. `WorldIDKitSign.tsx`, `WorldIDKitLink.tsx`, and World ID test pages.
- **Compliance PDF util removed**
  - `packages/client/src/lib/utils/compliance-pdf.ts`
- **Some contracts/interfaces removed**
  - World verifier + escrow-related Solidity files, interfaces, and mocks.

## Notes

- The branches diverge from a merge-base commit `49a7bed...`.
- Net effect: `main-29-mar-polar-works` is primarily **Polar checkout + subscription webhook syncing**, while `consumer-v1` contains substantially more **WorldID + incentives/escrow + contracts + related client UX** work that is absent from `main-29-mar-polar-works`.