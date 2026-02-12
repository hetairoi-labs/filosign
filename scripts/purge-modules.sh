#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR="$(cd "$DIR/.." && pwd)"
cd "$ROOT_DIR"

find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
rm -f bun.lock
rm -f bun.lockb

bun install
