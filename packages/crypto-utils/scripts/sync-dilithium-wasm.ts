#!/usr/bin/env bun
/**
 * Copies dilithium.wasm from the installed dilithium-crystals-js package
 * into packages/crypto-utils/assets/ (canonical copy for client, test, Docker).
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const assetsDir = join(import.meta.dir, "..", "assets");
const dest = join(assetsDir, "dilithium.wasm");

const pkgJson = import.meta.resolveSync("dilithium-crystals-js/package.json");
const src = join(dirname(pkgJson), "dilithium.wasm");

mkdirSync(assetsDir, { recursive: true });
copyFileSync(src, dest);
console.log(`[sync-dilithium-wasm] ${src} -> ${dest}`);
