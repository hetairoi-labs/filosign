#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR="$(cd "$DIR/.." && pwd)"
cd "$ROOT_DIR"

find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
find . -name ".bun" -type d -prune -exec rm -rf '{}' +
find . -name "dist" -type d -prune -exec rm -rf '{}' +
rm -f bun.lock