/**
 * Refreshes `definitions/*.ts` ABIs from Hardhat artifacts while keeping deployed `address`
 * values from the existing file.
 *
 * Run after `bun run compile`. Does not deploy — use `bun run migrate` to regenerate
 * addresses + ABIs from a live deployment (see scripts/deploy.ts).
 *
 * Usage:
 *   bun run scripts/syncDefinitionsFromArtifacts.ts definitions/local.ts
 *   bun run scripts/syncDefinitionsFromArtifacts.ts definitions/testnet.ts
 */
import fs from "node:fs";
import path from "node:path";

const ARTIFACTS_DIR = path.join(import.meta.dirname, "../artifacts/src");

const CONTRACTS = [
	"FSManager",
	"FSFileRegistry",
	"FSKeyRegistry",
	"FSEscrow",
] as const;

const DEFINITIONS_PREFIX = "export const definitions = ";
const DEFINITIONS_SUFFIX = " as const;\n";

function readAbi(contractName: (typeof CONTRACTS)[number]): unknown[] {
	const artifactPath = path.join(
		ARTIFACTS_DIR,
		`${contractName}.sol`,
		`${contractName}.json`,
	);
	const raw = fs.readFileSync(artifactPath, "utf8");
	const parsed = JSON.parse(raw) as { abi: unknown[] };
	return parsed.abi;
}

function extractChainKey(text: string): string {
	const m = text.match(/export const definitions = \{\s*"([^"]+)":/);
	if (!m?.[1])
		throw new Error("Could not find chain id key in definitions file");
	return m[1];
}

function extractAddress(text: string, contract: string): string {
	const re = new RegExp(`${contract}:\\s*{\\s*address:\\s*"([^"]+)"`, "m");
	const m = text.match(re);
	if (!m?.[1]) throw new Error(`Could not find address for ${contract}`);
	return m[1];
}

function main() {
	const target =
		process.argv[2] ??
		path.join(import.meta.dirname, "../definitions/local.ts");
	const abs = path.resolve(target);
	const previous = fs.readFileSync(abs, "utf8");

	const chainKey = extractChainKey(previous);

	const definitionsInner = {
		FSManager: {
			address: extractAddress(previous, "FSManager"),
			abi: readAbi("FSManager"),
		},
		FSFileRegistry: {
			address: extractAddress(previous, "FSFileRegistry"),
			abi: readAbi("FSFileRegistry"),
		},
		FSKeyRegistry: {
			address: extractAddress(previous, "FSKeyRegistry"),
			abi: readAbi("FSKeyRegistry"),
		},
		FSEscrow: {
			address: extractAddress(previous, "FSEscrow"),
			abi: readAbi("FSEscrow"),
		},
	} as const;

	const out = {
		[chainKey]: definitionsInner,
	};

	fs.writeFileSync(
		abs,
		DEFINITIONS_PREFIX + JSON.stringify(out, null, "\t") + DEFINITIONS_SUFFIX,
		"utf8",
	);
	console.log(
		`Synced ABIs from artifacts → ${path.relative(process.cwd(), abs)}`,
	);
}

main();
