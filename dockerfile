# syntax=docker/dockerfile:1.20
# Stage 1: Build
FROM oven/bun:1.3.11 AS builder
WORKDIR /app

# Caching bun install dependencies
COPY package.json bun.lock ./
COPY --parents packages/*/package.json packages/*/*/package.json ./

# Remove the test workspace so bun install won't look for it
RUN sed -i '/"test",/d' package.json

RUN --mount=type=cache,target=/root/.bun/install/cache \
	bun install

COPY . .

RUN bun run server:compile

# Stage 2: Compile and run
FROM debian:bookworm-slim AS release
WORKDIR /app

COPY --from=builder /app/packages/server/out/server .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["./server"]
