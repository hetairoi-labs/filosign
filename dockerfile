# syntax=docker/dockerfile:1.20
# Stage 1: Build
FROM oven/bun:1.3.14 AS builder
WORKDIR /app

# Cache dependency install (workspaces: apps/*, packages/* including packages/test)
COPY package.json bun.lock ./
COPY patches ./patches
COPY --parents apps/*/package.json packages/*/package.json ./

RUN --mount=type=cache,target=/root/.bun/install/cache \
	bun install --frozen-lockfile

COPY . .

# Compiled server (root scripts/build.ts → apps/server compile)
RUN bun run build -- --server

# Stage 2: Compile and run
FROM debian:bookworm-slim AS release
WORKDIR /app

COPY --from=builder /app/apps/server/out/server .
COPY --from=builder /app/packages/crypto-utils/assets/dilithium.wasm ./assets/dilithium.wasm

ENV NODE_ENV=production
EXPOSE 3000

CMD ["./server"]
