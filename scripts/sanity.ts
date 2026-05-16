#!/usr/bin/env bun
/**
 * Sanity gate: check + tests + Hardhat (CI / pre-push).
 *
 * Usage:
 *   bun run sanity                 # check (--ci + types) + unit tests + Hardhat
 *   bun run sanity -- --fast       # check + unit tests only (no Hardhat)
 *   bun run sanity -- --check      # check only
 *   bun run sanity -- --test       # test only (excludes contracts)
 *   bun run sanity -- --contracts  # Hardhat only
 *   bun run sanity -- --help
 */
import { die, runMain, scriptArgv, wantsHelp } from "./lib/cli.ts";
import { repoRoot } from "./lib/root.ts";
import { runSequentialExit } from "./lib/spawn.ts";

const rootDir = repoRoot(import.meta.url);

const FAST_TEST_FILTER = "@filosign/*";
const EXCLUDE_CONTRACTS = "!@filosign/contracts";

type Step = "check" | "test" | "contracts";

const STEP_FLAGS: Record<Step, string[]> = {
	check: ["--check", "check"],
	test: ["--test", "test"],
	contracts: ["--contracts", "contracts"],
};

const MODE_FLAGS = {
	fast: ["--fast", "fast"],
	full: ["--full", "full"],
} as const;

const HELP = `
Filosign sanity orchestrator (pre-push / CI)

  bun run sanity                 check (--ci + types) + unit tests + Hardhat (default)
  bun run sanity -- --fast       check + unit tests only (skip Hardhat)

Uses check --ci so CI/pre-push never mutates files (see check --help).

Steps only:
  bun run sanity -- --check
  bun run sanity -- --test
  bun run sanity -- --test server   forwarded to test orchestrator
  bun run sanity -- --contracts     Hardhat only

  --full is an alias for the default (all steps).
`.trim();

function parseArgv(argv: string[]) {
	let fast = false;
	const steps = new Set<Step>();
	const passthrough: string[] = [];

	for (const arg of argv) {
		if (MODE_FLAGS.fast.includes(arg)) {
			fast = true;
			continue;
		}
		if (MODE_FLAGS.full.includes(arg)) {
			continue;
		}

		let matched = false;
		for (const [step, flags] of Object.entries(STEP_FLAGS) as [
			Step,
			string[],
		][]) {
			if (flags.includes(arg)) {
				steps.add(step);
				matched = true;
				break;
			}
		}
		if (!matched) passthrough.push(arg);
	}

	if (steps.size === 0) {
		steps.add("check");
		steps.add("test");
		if (!fast) steps.add("contracts");
	}

	return { steps, passthrough };
}

/** Read-only Biome + types — safe for CI and pre-push (no workspace writes). */
function checkCmd(): string[] {
	return ["bun", "run", "check", "--", "--ci", "--types"];
}

function fastUnitTestsCmd(): string[] {
	return [
		"bunx",
		"turbo",
		"run",
		"test",
		`--filter=${FAST_TEST_FILTER}`,
		`--filter=${EXCLUDE_CONTRACTS}`,
	];
}

function testCmd(steps: Set<Step>, passthrough: string[]): string[] | null {
	if (!steps.has("test")) return null;

	if (passthrough.length > 0) {
		return ["bun", "run", "test", "--", ...passthrough];
	}

	return fastUnitTestsCmd();
}

function contractsTestCmd(): string[] {
	return ["bun", "run", "contracts", "--", "test"];
}

function buildCommands(steps: Set<Step>, passthrough: string[]): string[][] {
	const cmds: string[][] = [];

	if (steps.has("check")) {
		cmds.push(checkCmd());
	}

	const test = testCmd(steps, passthrough);
	if (test) cmds.push(test);

	if (steps.has("contracts")) {
		cmds.push(contractsTestCmd());
	}

	return cmds;
}

runMain(async () => {
	const argv = scriptArgv();

	if (wantsHelp(argv)) {
		console.log(HELP);
		process.exit(0);
	}

	const { steps, passthrough } = parseArgv(argv);
	const cmds = buildCommands(steps, passthrough);

	if (cmds.length === 0) die("No sanity steps selected");

	await runSequentialExit(rootDir, cmds);
});
