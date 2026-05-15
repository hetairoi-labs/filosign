/**
 * After `hardhat compile`, updates `abi` fields in definitions/*.ts from artifacts
 * while preserving deployed `address` values.
 */
import fs from "node:fs";
import path from "node:path";

/** Run from the contracts package root (`bun run scripts/syncDefinitionsAbi.ts`). */
const CONTRACTS_DIR = process.cwd();
const ART = path.join(CONTRACTS_DIR, "artifacts/src");

const KEYS = [
	"FSManager",
	"FSFileRegistry",
	"FSKeyRegistry",
	"FSEscrow",
] as const;

const KEYS_LOCAL = [...KEYS, "MockUSDC"] as const;

const ARTIFACT: Record<(typeof KEYS_LOCAL)[number], string> = {
	FSManager: "FSManager.sol/FSManager.json",
	FSFileRegistry: "FSFileRegistry.sol/FSFileRegistry.json",
	FSKeyRegistry: "FSKeyRegistry.sol/FSKeyRegistry.json",
	FSEscrow: "FSEscrow.sol/FSEscrow.json",
	MockUSDC: "MockUSDCToken.sol/MockUSDCToken.json",
};

function readAbi(rel: string): readonly unknown[] {
	const full = path.join(ART, rel);
	const j = JSON.parse(fs.readFileSync(full, "utf8")) as { abi: unknown[] };
	return j.abi;
}

function findClosingBracket(s: string, openPos: number): number {
	if (s[openPos] !== "[") return -1;
	let depth = 1;
	let i = openPos + 1;
	let inStr: '"' | "'" | null = null;
	let esc = false;
	for (; i < s.length; i++) {
		const c = s[i];
		if (inStr) {
			if (esc) {
				esc = false;
				continue;
			}
			if (c === "\\") {
				esc = true;
				continue;
			}
			if (c === inStr) inStr = null;
			continue;
		}
		if (c === '"' || c === "'") {
			inStr = c as '"' | "'";
			continue;
		}
		if (c === "[") depth++;
		else if (c === "]") {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

function replaceContractAbi(
	text: string,
	key: (typeof KEYS_LOCAL)[number],
	newAbiFormatted: string,
): string {
	const patterns = [`"${key}"`, `'${key}'`, `${key}:`];
	let keyPos = -1;
	for (const p of patterns) {
		keyPos = text.indexOf(p);
		if (keyPos !== -1) break;
	}
	if (keyPos === -1) {
		throw new Error(`Missing contract key ${key}`);
	}
	const abiNeedles = ['"abi"', "'abi'", "abi:"];
	let abiPos = -1;
	for (const n of abiNeedles) {
		abiPos = text.indexOf(n, keyPos);
		if (abiPos !== -1) break;
	}
	if (abiPos === -1) throw new Error(`Missing abi for ${key}`);
	const bracketPos = text.indexOf("[", abiPos);
	if (bracketPos === -1) throw new Error(`Missing [ for abi ${key}`);
	const closePos = findClosingBracket(text, bracketPos);
	if (closePos === -1) throw new Error(`Unclosed abi for ${key}`);
	return text.slice(0, bracketPos) + newAbiFormatted + text.slice(closePos + 1);
}

function patchDefinitionsFile(filePath: string) {
	let text = fs.readFileSync(filePath, "utf8");
	const keys = filePath.endsWith("local.ts") ? KEYS_LOCAL : KEYS;
	for (const key of keys) {
		const abiArr = readAbi(ARTIFACT[key]);
		const abiJson = JSON.stringify(abiArr, null, "\t");
		if (key === "MockUSDC") {
			const mockNeedles = [`"${key}"`, `'${key}'`, `${key}:`];
			if (!mockNeedles.some((n) => text.includes(n))) {
				console.warn(
					`Skipping ${key} in ${filePath}: no entry yet (run local deploy once to add it).`,
				);
				continue;
			}
		}
		text = replaceContractAbi(text, key, abiJson);
	}
	fs.writeFileSync(filePath, text);
	console.log("Patched", filePath);
}

for (const f of ["definitions/testnet.ts", "definitions/local.ts"]) {
	patchDefinitionsFile(path.join(CONTRACTS_DIR, f));
}
