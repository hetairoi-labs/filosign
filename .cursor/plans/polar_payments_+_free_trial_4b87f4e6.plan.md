---
name: Polar payments + free trial
overview: Add a minimal Polar subscription integration with an app-managed 7‑day free trial (no card), and keep entitlements authoritative in your database while syncing paid subscription state from Polar via webhooks.
todos:
  - id: schema-billing
    content: "Add billing schema tables: billing_customers, billing_subscriptions, billing_entitlements, billing_webhook_events; export via server drizzle schema index."
    status: pending
  - id: billing-routes
    content: "Add minimal billing routes: start trial, get status, create checkout session (uses POLAR_PRODUCT_ID + external_customer_id)."
    status: pending
  - id: polar-webhooks
    content: Add Polar webhook endpoint with signature verification using POLAR_WEBHOOK_SECRET, idempotent processing, and subscription/entitlement sync.
    status: pending
  - id: client-gating
    content: "Add client gating: if not entitled or trial expired show upgrade CTA; redirect to Polar checkout; refresh status on success return."
    status: pending
  - id: ops-docs
    content: "Add minimal internal docs: required Polar dashboard setup, webhook endpoint events to subscribe to, sandbox/prod env notes."
    status: pending
isProject: false
---

## Goals

- **Free 7‑day trial with no card**: grant full teams plan access immediately on signup.
- **Paid subscriptions via Polar**: when trial ends (or user upgrades), redirect to Polar Checkout.
- **DB is source of truth for access**: Polar is source of truth for billing events; your DB stores normalized subscription/entitlement state.
- **Matches 3-tier product model**: Individual vs Teams vs Enterprise, aligned with the enterprise org/project plan.

## Key Polar constraints (drives architecture)

- Polar’s built-in **subscription trials still collect payment info at checkout** ([Trials](https://polar.sh/docs/features/trials.md)). That conflicts with your “no card before try” goal.
- Therefore: implement **app-managed trials** (no Polar object needed), and only send users to Polar when they’re ready to pay.
- **Webhooks are required** to keep your DB accurate; Polar webhooks are signed (Standard Webhooks) and you should verify with a secret ([Setup Webhooks](https://polar.sh/docs/integrate/webhooks/endpoints), [Create Webhook Endpoint](https://polar.sh/docs/api-reference/webhooks/endpoints/create.md)).

## Product tiers (billing + entitlement ownership)

This plan assumes the org/project model is implemented off-chain (DB) and billing entitlements map to either a **user** (Individual tier) or an **organization** (Teams/Enterprise tiers).

## Default onboarding (PLG)
- **Every new user gets a default organization** (a “personal workspace” style org they own).
- **Every new user starts on a Teams-tier trial for that default org** for 7 days (no card).
- After 7 days, the org is **downgraded to read-only** until the org upgrades.
  - Read-only means: can still view existing envelopes they have access to, but cannot create/send new envelopes.

**Standard practice note**: Yes—an individual user can create an organization. That’s the common SaaS pattern: users are individuals; orgs/workspaces are containers they create/join; billing is typically org-scoped.

### Tier 1 — Individual

- **Entitlement owner**: user
- **Trial**: 7 days free, no card (app-managed)
- **Paid**: Polar subscription for the user

### Tier 2 — Teams

- **Entitlement owner**: organization (team/workspace)
- **Trial**: 7 days free for the org, no card (app-managed)
- **Paid**: Polar subscription for the org
- **Seat limits** (optional later): enforced off-chain (RBAC + seat count), not required for MVP

### Tier 3 — Enterprise

- **Entitlement owner**: organization
- **Trial**: 7 days free for the org, no card (app-managed)
- **Paid**: Polar subscription for the org (or invoicing later, but Polar keeps the canonical subscription state)
- **Add-ons**: governance (e.g., Safe-based approvals) and SSO/SCIM are enterprise features, but do not change Polar fundamentals

## Data model (minimal now, extensible later)

Add billing tables alongside existing user/file schemas (you currently have `users` keyed by `walletAddress` in `packages/server/lib/db/schema/user.ts`).

- `billing_customers`
  - `ownerType`: `"user" | "organization"` (align with enterprise plan; start with `"user"` and add `"organization"` when Teams ships)
  - `ownerId`: for user: wallet address; for org: org UUID/ID
  - `polarCustomerId` (nullable until first checkout)
  - `externalCustomerId` (stable ID you pass to Polar; recommended: your walletAddress or internal UUID)
  - `email` (optional mirror, useful for receipts/support)
- `billing_entitlements`
  - `ownerType`, `ownerId`
  - `plan`: `"individual" | "teams" | "enterprise"` (or similar)
  - `status`: `"active" | "expired" | "revoked"`
  - `trialEndsAt` (only for trial)
  - `activeUntil` (optional, for grace periods)
- `billing_subscriptions`
  - `ownerType`, `ownerId`
  - `polarSubscriptionId`
  - `polarProductId` (store which product)
  - `status` (map from Polar lifecycle: active/canceled/past_due/etc.)
  - `currentPeriodStart`, `currentPeriodEnd`
  - `cancelAtPeriodEnd` / `canceledAt`
- `billing_webhook_events` (idempotency)
  - `eventId` (from webhook payload)
  - `receivedAt`, `processedAt`
  - `payloadHash` (optional)

This keeps **trial**, **entitlement**, and **subscription** separate so you can later add seat-based pricing or usage billing without reworking the access check logic.

## Server API surface (minimal)

All server-side; never expose `POLAR_ACCESS_TOKEN`.

- `POST /api/billing/trial/start`
  - Accept `{ ownerType, ownerId }` (user vs org) OR infer from auth context.
  - If owner has no entitlement, create an entitlement with `trialEndsAt=now+7d`.
  - Enforce “one trial per owner”.
- `GET /api/billing/status`
  - Returns computed access for the current **user** and/or selected **org**: `isEntitled`, `plan`, `trialEndsAt`, `subscriptionStatus`, etc.
  - This is what your client uses to gate UI.
- `POST /api/billing/checkout`
  - Creates a Polar checkout session via SDK/API using `POLAR_PRODUCT_ID` **per tier** (typically different products/price points for Individual vs Teams vs Enterprise).
  - Pass `external_customer_id` so Polar creates/links the Polar customer to your owner (user/org) ([Checkout API](https://polar.sh/docs/features/checkout/session.md) mentions `external_customer_id`).
  - Return `checkout.url` to the client.
- `POST /api/webhooks/polar`
  - Verify signature using `POLAR_WEBHOOK_SECRET` (yes, you need this for secure verification).
  - Idempotency: store `eventId` in `billing_webhook_events` and skip if already processed.
  - Handle key events (start minimal):
    - `subscription.created`, `subscription.active`, `subscription.updated`, `subscription.canceled`, `subscription.revoked`, `subscription.past_due`
    - `order.paid` (if you need order-level confirmation)
  - Update `billing_subscriptions` and derive `billing_entitlements` from subscription state.

## Client UX flow (minimal)

- On signup: auto-create a **default org** and start a **Teams trial** for that org automatically.
- Optionally: allow additional org creation during trial (viral loop), but keep entitlement scoped to the owning org(s) you choose (see notes below).
- Everywhere you gate paid features: check `/api/billing/status` for the active scope (user or selected org).
- When org trial expired: show “Upgrade” CTA that calls `/api/billing/checkout` for Teams and redirects to returned `checkout.url`.
- Enforce downgrade: when not entitled, allow read-only actions but block write actions (create envelope, send envelope, invite if you decide invites are write).
- On return to `POLAR_SUCCESS_URL`: poll `/api/billing/status` (or wait for webhook) and refresh UI.

### Notes on “many orgs during trial”
Two valid approaches; pick one during implementation:
- **A. One trial org per user (simplest)**: user can create multiple orgs, but only the default org starts with a trial; others are read-only until upgraded.
- **B. Trial follows the user (more viral, more abuse risk)**: new orgs created by a trialing user also get a 7-day Teams trial; requires stronger anti-abuse controls.

## Best practices / “industry standard” decisions

- **DB entitlement check is the only gate**: never infer access client-side.
- **Webhook-first sync**: don’t rely on the success redirect as confirmation; it’s not authoritative.
- **Idempotency + replay safety**: store webhook event IDs; webhook handlers must be safe to retry.
- **Separate sandbox vs prod**: use `POLAR_MODE` to choose API base (`sandbox-api.polar.sh` vs `api.polar.sh`) ([API overview](https://polar.sh/docs/api)).
- **External customer ID**: always set it in checkout creation to avoid fuzzy matching and to support support/debugging.
- **Grace periods**: optionally keep entitlements active for short time if `past_due` to reduce churn.
- **Teams vs Enterprise is primarily entitlement + feature flags**: billing is the same model; feature gating is driven by plan tier.
  - Teams: org entitlement only.
  - Enterprise: org entitlement + enable governance (Safe) and SSO/SCIM features.

## Files likely to change

- DB schema additions under:
  - `packages/server/lib/db/schema/` (new `billing.ts`, export via `schema/index.ts`)
- New server routes:
  - `packages/server/api/routes/billing/index.ts` (trial/start, status, checkout)
  - `packages/server/api/routes/webhooks/polar.ts` (webhook handler)
  - wire into `packages/server/api/routes/router.ts`
- Shared types / zod:
  - `packages/shared` (if you keep API payload shapes centralized)

## Polar SDK usage

Use the official TS SDK server-side with environment-specific server selection (sandbox vs prod) ([API overview](https://polar.sh/docs/api)). Create checkout sessions via `checkouts.create` ([Checkout API](https://polar.sh/docs/features/checkout/session.md)).