---
name: Magic link + secret onboarding (Privy, no WaaP)
overview: Cold send without prior connection; magic link + OOB secret for decrypt; signing establishes trust via bundled approveSender submission by server; registerFile/send-key gates already removed. Privy-only identity (no WaaP).
todos:
  - id: contracts-remove-registerFile-approvedSenders
    content: "Done: FSFileRegistry no longer gates registerFile by approvedSenders."
    status: completed
  - id: sdk-sign-bundle-approveSender
    content: "Done: react-sdk useSignFile now signs ApproveSender inside sign action and sends approveSender payload with /files/:pieceCid/sign."
    status: completed
  - id: server-sign-submits-approveSender
    content: "Done: POST /files/:pieceCid/sign simulates/writes approveSender after registerFileSignature and treats SenderAlreadyApproved as success."
    status: completed
  - id: api-profile-keys-without-sharing-edge
    content: "Done via current behavior: /users/profile/:q returns encryptionPublicKey without mutual share gate."
    status: completed
  - id: sdk-useProfilesByAddresses-switch
    content: "Done/N.A.: useProfilesByAddresses continues using /users/profile/:address; route already supports cold lookup."
    status: completed
  - id: ui-recipients-remove-connection-copy
    content: "Done in current flow: envelope recipients support wallet/email cold entry without connection prerequisite."
    status: completed
  - id: ui-sign-trust-copy
    content: "Sign document page: disclose that signing trusts sender / establishes connection (matches on-chain approveSender)."
    status: pending
  - id: sharing-api-deprecate-send-gating
    content: "Done for app send flow: no apps/client dependency on /sharing/can-send-to as send prerequisite."
    status: completed
  - id: connections-docs-handler-comments
    content: "Update apps/server/api/handlers/sharing.ts + README references — trust established by signing document, not only POST /sharing/approve."
    status: pending
  - id: optional-reciprocal-on-sign
    content: "Product call — call ensureReciprocalShareRequest after auto approveSender so sender gets pending reverse request (mutual convenience)."
    status: pending
  - id: invite-envelope-spec
    content: "Specify KDF + AEAD for invite-only DEK wrap; split-channel secret; TTL; no plaintext secret persistence (email_e2e Appendix A/C/D)."
    status: pending
  - id: schema-participants-fk
    content: "Placeholder users vs FK relaxation vs invite sidecar for strangers on chain + DB."
    status: pending
  - id: send-flow-invite-wrap
    content: "Extend useSendFile / envelope for recipients without encryptionPublicKey (invite wrap + optional Kyber)."
    status: pending
  - id: magic-link-route
    content: "apps/client public route + server token validation + secret entry + client unwrap/decrypt preview."
    status: pending
  - id: optional-rewrap-api
    content: "Authenticated Kyber re-wrap POST + retire invite artifacts (email_e2e Appendix D)."
    status: pending
  - id: signing-path-oneoff
    content: "Keep minimal onboarding before POST /sign (PIN + Dilithium user row) unless anonymous-sign redesign approved."
    status: pending
  - id: test-contracts-integration
    content: "Forge + app integration/e2e for trust-on-sign path and idempotent approval behavior."
    status: pending
isProject: false
---

# Magic link + secret code onboarding (Privy architecture, no WaaP)

**Context:** Cold send aligned with [email_e2e_analysis_e9bcb7c8.plan.md](email_e2e_analysis_e9bcb7c8.plan.md); identity matches [send_sign_flow_architecture.plan.md](send_sign_flow_architecture.plan.md) section 2 (**Privy + wagmi**), without WaaP assumptions.

**Locked product decision:** Recipient should not see another approval prompt. Clicking **Sign** is sufficient intent. Server submits approval in the sign flow and waits for completion before success response.

---

## 1. Current state (already implemented)

- `FSFileRegistry.validateFileRegistrationSignature` no longer checks `approvedSenders` for recipients.
- `useSignFile` now produces both signatures in one user action:
  - SignFile EIP-712 + Dilithium
  - ApproveSender EIP-712
- `POST /files/:pieceCid/sign`:
  - accepts `approveSender` payload
  - runs `registerFileSignature` then `approveSender`
  - treats `SenderAlreadyApproved` as idempotent success
- `/users/profile/:q` currently returns `encryptionPublicKey` without a mutual-share requirement, enabling cold send key resolution.

**Clarified invariant:** No second prompt is required, but cryptography is still recipient-authorized (signature generated during sign action and relayed by server).

**Connection/indexer behavior:** `SenderApproved` continues populating `shareApprovals`, so Connections UI converges after first signed document.

---

## 2. Remaining backlog (ordered)

### A. UX and docs polish

1. Add sign-page disclosure copy: signing records sender approval; revocation is still possible via `revokeSender`.
2. Update sharing docs and handler comments to reflect trust-on-sign path (not only `POST /sharing/approve`).

### B. Product toggle decision (still open)

3. Decide whether to call `ensureReciprocalShareRequest` post-approval for reverse-request convenience UX.

### C. Magic-link invite track (main remaining scope)

4. Finalize invite-envelope cryptographic spec (KDF + AEAD, split-channel secret, TTL, no plaintext secret persistence).
5. Resolve schema strategy for unknown recipients (placeholder users vs FK relaxation vs invite sidecar).
6. Extend send flow for recipients missing `encryptionPublicKey` (invite wrap path + optional Kyber re-wrap).
7. Implement public magic-link route + server token validation + secret entry + client decrypt preview.
8. Optional: add authenticated re-wrap API and retire invite artifacts after onboarding.
9. Keep minimal onboarding required before `/sign` unless anonymous-sign architecture is explicitly approved.

### D. Verification and hardening

10. Add/refresh tests for:
   - registerFile without prior sender approval
   - sign flow including bundled `approveSender`
   - idempotent already-approved sender path
11. Run `forge test`, `bun check`, `bun tsc`, and `bun run test`.

---

## 3. Architecture sketch (authoritative)

```mermaid
sequenceDiagram
  participant S as Sender
  participant API as Server
  participant Chain as Contracts
  participant R as Recipient

  S->>API: POST /files + registerFile (no prior approveSender)
  Chain->>Chain: FileRegistered
  R->>R: Magic link + secret -> decrypt view
  R->>R: Privy + PIN -> click Sign once
  R->>API: POST /sign body includes SignFile sig + ApproveSender sig
  API->>Chain: registerFileSignature
  API->>Chain: approveSender(recipient=R, sender=S)
  Note over API: Wait both tx paths before success response
  Note over API: Indexer inserts shareApprovals on SenderApproved
```

---

## 4. Clarifications recorded from product direction

- No extra confirmation modal or second signing prompt for sender approval.
- "Server does it on behalf of user" means relay submission inside sign endpoint, not unsigned server-only trust mutation.
- Current sequencing is acceptable: sign tx path then approve path in same request, waiting for completion before returning success.

---

## 5. Status summary

| Topic | Conclusion |
|--------|------------|
| **Connections before send** | Removed in current implementation path (on-chain + profile lookup behavior). |
| **approveSender** | Bundled with sign action and submitted server-side in sign endpoint; no additional user prompt. |
| **Connections UI / DB** | `shareApprovals` is still populated via `SenderApproved` events after sign. |
| **Biggest remaining work** | Magic-link invite/decrypt pipeline, schema decisions, and final docs/tests. |
