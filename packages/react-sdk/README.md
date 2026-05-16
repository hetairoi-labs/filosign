# `@filosign/react`

React SDK for Filosign: **`FilosignProvider`** (context + oRPC client + wagmi/contracts) and **TanStack Query hooks** from domain subpaths below.

## Imports

| Entry | Purpose |
|-------|---------|
| `@filosign/react` | `FilosignProvider`, `useFilosignContext()` — includes `rpc`, `rpcQuery`, `session` |
| `@filosign/react/auth` | Session, login, JWT gate (`useAuthedApi`) |
| `@filosign/react/files` | Documents, cold invite, signing, file lists |
| `@filosign/react/sharing` | Connections, approvals, share requests |
| `@filosign/react/users` | Profile read/update, Privy email sync |
| `@filosign/react/runtime` | `useRuntimeChain` (chain from loaded contracts) |
| `@filosign/react/utils` | Crypto/file helpers reused by hooks and some client flows |

Import only the subpath you need so the bundler does not pull unrelated hook modules.

## API data fetching (single pattern)

All **HTTP API** traffic goes through the typed oRPC client on context:

1. **`useFilosignContext().rpc`** — low-level procedure client (JWT on `session`).
2. **`useFilosignContext().rpcQuery`** — [`@orpc/tanstack-query`](https://orpc.dev/docs/integrations/tanstack-query) helpers: `.queryOptions()`, `.mutationOptions()`, `.call()`, `.key()`.
3. **`useFilosignRpc()`** (internal to hooks) — `{ rpcQuery, isAuthed, auth, rpc }` where `isAuthed` comes from **`useAuthedApi`** (wallet signature → JWT).

Hooks follow:

```ts
const { rpcQuery, isAuthed } = useFilosignRpc();

return useQuery({
  ...rpcQuery.users.profile.me.queryOptions(),
  enabled: isAuthed,
  staleTime: 1 * DAY,
});
```

Mutations use `...rpcQuery.*.mutationOptions()` and `rpcQuery.*.call(input)` when the `mutationFn` adds crypto, uploads, or contract work. Invalidate with **`rpcQuery.<domain>.key()`** (e.g. `rpcQuery.users.profile.me.key()`), not ad-hoc string keys.

**Exceptions (not oRPC):** on-chain reads (`useIsRegistered`, `useCanReceiveFrom`, incentives), session seed / wallet crypto, and direct **`fetch` PUT** to presigned storage URLs.

Do not bypass the typed client with ad-hoc `fetch` to `/api/rpc` from app code unless the codebase already documents an exception.

## Package layout (`src/`)

- `context/` — provider and context
- `hooks/` — feature hooks (`auth`, `files`, `sharing`, `users`)
- `lib/` — `useFilosignRpc`, cache invalidation helpers, non-RPC query keys
- `orpc/` — client factory, `rpc-query-utils`, router types
