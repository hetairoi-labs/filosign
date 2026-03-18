#!/usr/bin/env bash

set -euo pipefail

echo "-> Deleting node_modules directories..."
find . -path "./packages/contracts" -prune -o -type d -name "node_modules" -exec rm -rf {} +

echo "-> Deleting bun.lock files..."
find . -path "./packages/contracts" -prune -o -type f -name "bun.lock" -exec rm -f {} +

bun install
echo "🔥 Freshly baked."
