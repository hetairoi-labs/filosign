#!/usr/bin/env bash

set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR="$(cd "$DIR/.." && pwd)"
cd "$ROOT_DIR"

ENVIRONMENT="${1:-}"

case "$ENVIRONMENT" in
  "")
    echo "Deploying contracts to local network..."
    bun run --cwd packages/contracts migrate
    ;;
  testnet)
    echo "Deploying contracts to testnet..."
    bun run --cwd packages/contracts migrate:testnet
    ;;
  mainnet)
    echo "Deploying contracts to mainnet..."
    bun run --cwd packages/contracts migrate:mainnet
    ;;
  *)
    echo "Unknown environment: '$ENVIRONMENT'" >&2
    echo "Usage: $0 [testnet|mainnet]" >&2
    exit 1
    ;;
esac

echo "Purging database..."
bun run db:purge

echo "Pushing database schema..."
bun run db:push