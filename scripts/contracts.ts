#!/usr/bin/env bun
/**
 * Contracts orchestrator (@filosign/contracts + DB when migrating).
 *
 * Usage:
 *   bun run contracts -- compile | test | node
 *   bun run contracts -- --deploy --local|testnet|mainnet
 *   bun run contracts -- --migrate --local|testnet|mainnet
 *   bun run contracts -- --help
 */
import { die, exitOnHelpOrEmpty, runMain, scriptArgv } from "./lib/cli.ts";
import { repoRoot } from "./lib/root.ts";
import { packageRunCmd } from "./lib/run.ts";
import { runInheritExit, runSequentialExit } from "./lib/spawn.ts";

const rootDir = repoRoot(import.meta.url);
const PACKAGE = "@filosign/contracts";

type Profile = "local" | "testnet" | "mainnet";
type Mode = "deploy" | "migrate";

const HELP = `
Filosign contracts orchestrator

Utilities (@filosign/contracts):
  bun run contracts -- compile
  bun run contracts -- test              compile + Hardhat tests
  bun run contracts -- node              Hardhat local node

Deploy (contracts only — Hardhat deploy, updates definitions/):
  bun run contracts -- --deploy --local
  bun run contracts -- --deploy --testnet
  bun run contracts -- --deploy --mainnet

Migrate (deploy contracts, then db purge — local/testnet; purge includes push):
  bun run contracts -- --migrate --local
  bun run contracts -- --migrate --testnet
  bun run contracts -- --migrate --mainnet

Profiles: local (.env.local), testnet (.env.staging), mainnet (.env.production)
`.trim();

const UTILITY_COMMANDS = {
	compile: "compile",
	test: "test",
	node: "node",
} as const;

type UtilityCommand = keyof typeof UTILITY_COMMANDS;

function deployScript(profile: Profile): string {
	switch (profile) {
		case "local":
			return "deploy:local";
		case "testnet":
			return "deploy:testnet";
		case "mainnet":
			return "deploy:mainnet";
	}
}

function dbCmd(
	action: "push" | "purge",
	profile: "local" | "testnet",
): string[] {
	return ["bun", "run", "db", "--", action, profile];
}

function parseArgv(argv: string[]) {
	let deploy = false;
	let migrate = false;
	let profile: Profile | undefined;
	let utility: UtilityCommand | undefined;

	for (const arg of argv) {
		if (arg === "--deploy") deploy = true;
		if (arg === "--migrate") migrate = true;
		if (arg === "--local") profile = "local";
		if (arg === "--testnet") profile = "testnet";
		if (arg === "--mainnet") profile = "mainnet";
		if (arg in UTILITY_COMMANDS) utility = arg as UtilityCommand;
	}

	let mode: Mode | undefined;
	if (deploy && migrate) die("Use either --deploy or --migrate, not both");
	if (deploy) mode = "deploy";
	if (migrate) mode = "migrate";

	return { mode, profile, utility };
}

function requireProfile(profile: Profile | undefined): Profile {
	if (profile === "local" || profile === "testnet" || profile === "mainnet") {
		return profile;
	}
	die("Pass a profile: --local, --testnet, or --mainnet");
}

async function runDeploy(profile: Profile) {
	await runInheritExit(
		rootDir,
		packageRunCmd(rootDir, PACKAGE, deployScript(profile)),
	);
}

async function runMigrate(profile: Profile) {
	const steps: string[][] = [
		packageRunCmd(rootDir, PACKAGE, deployScript(profile)),
	];

	if (profile === "local") {
		steps.push(dbCmd("purge", "local"));
	} else if (profile === "testnet") {
		steps.push(dbCmd("purge", "testnet"));
	}

	await runSequentialExit(rootDir, steps);
}

runMain(async () => {
	const argv = scriptArgv();
	exitOnHelpOrEmpty(HELP, argv);

	const { mode, profile, utility } = parseArgv(argv);

	if (utility) {
		if (mode) die(`Do not combine --${mode} with ${utility}`);
		await runInheritExit(
			rootDir,
			packageRunCmd(rootDir, PACKAGE, UTILITY_COMMANDS[utility]),
		);
	}

	if (!mode) {
		console.error(
			"Missing --deploy or --migrate. Try: bun run contracts -- --help\n",
		);
		console.log(HELP);
		process.exit(1);
	}

	const p = requireProfile(profile);

	if (mode === "deploy") {
		await runDeploy(p);
		return;
	}

	await runMigrate(p);
});
