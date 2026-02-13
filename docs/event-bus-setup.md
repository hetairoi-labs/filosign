# Event Bus Setup (Redis + SSE)

## What's Done

1. **`lib/redis.ts`** – Bun native Redis client
   - Uses `REDIS_URL` or `VALKEY_URL` (optional; no Redis = in-memory only)
   - Publisher client for `publish()`
   - `createRedisSubscriber()` for cross-instance fan-out

2. **`lib/events/bus.ts`** – Event bus
   - `publish(topic, payload)` – Publishes to Redis + local emitter
   - `subscribe(topic, handler)` – Local subscription (used by SSE route)
   - `startRedisSubscriber()` – Subscribes to Redis and forwards to local emitter
   - Topics: `registration:{txHash}`, `file-ack:{pieceCid}`, `file-sign:{pieceCid}`

3. **`lib/indexer/process.ts`** – Emits on registration complete
   - `publish(topics.registration(txHash), { status, wallet })`

4. **`index.ts`** – Starts Redis subscriber on boot

5. **`api/routes/subscriptions.ts`** – SSE endpoint (Hono `streamSSE`)
   - `GET /api/subscriptions?topics=registration:0x123,file-ack:abc`
   - Subscribes to event bus, streams events to client until disconnect
   - Uses `stream.onAbort()` for cleanup

**Design notes:**
- **EventEmitter** – Used for in-process pub/sub; appropriate for topic-based local fan-out from Redis.
- **Hono streamSSE** – Native SSE support with `writeSSE`, `onAbort`, keep-alive headers.

---

## Env Setup

### Local (no Redis)

- Omit `REDIS_URL` – events stay in-memory (single-instance)

### Production (Upstash)

1. Create a Redis database at [Upstash Console](https://console.upstash.com/)
2. Copy the **TLS** URL (`rediss://...`)
3. Add to `.env.prod`:

```bash
REDIS_URL=rediss://default:****@****.upstash.io:6379
```

---

## Further Steps

### 1. SDK: Use SSE helpers (done for useLogin)

`@filosign/react/sse` exports `subscribeSSE()` and `sseTopics`:

```ts
import { subscribeSSE, sseTopics } from "@filosign/react/sse";

await subscribeSSE(api.baseUrl, [sseTopics.registration(txHash)], {
  matcher: (e) => e.payload?.status === "completed",
});
```

### 2. Auth on SSE

- Pass JWT via query (`?token=`) or `Authorization` header
- Validate in the route before starting the stream

### 3. Add More Emits

In `processTransaction` for FSManager (SenderApproved, etc.) and in file ack/sign routes, add:

```ts
publish(topics.fileAck(pieceCid), { status: "completed" });
```

---

## Architecture

```
[processTransaction] --> publish(topic, payload)
                              |
                              v
                    [Redis CHANNEL "fs:events"]
                              |
         +--------------------+--------------------+
         v                    v                    v
   [Server A]           [Server B]           [Server C]
   subscribe()           subscribe()          subscribe()
         |                    |                    |
         v                    v                    v
   [Local SSE clients]  [Local SSE clients]  [Local SSE clients]
```
