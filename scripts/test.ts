#!/usr/bin/env bun
/**
 * Test orchestrator (Turbo `test` task).
 *
 * Usage:
 *   bun run test                 # all @filosign/* packages
 *   bun run test -- --server     # one package (see --help)
 *   bun run test -- server       # same (-- optional for package name)
 *   bun run test -- --help
 */
import { die, runMain, scriptArgv, wantsHelp } from "./lib/cli.ts";
import { repoRoot } from "./lib/root.ts";
import { parsePackageFilter } from "./lib/scopes.ts";
import { runInheritExit } from "./lib/spawn.ts";

const rootDir = repoRoot(import.meta.url);

const HELP = `
Filosign test orchestrator (Turbo)

  bun run test                 all @filosign/* packages with a test script

Scoped (one package):
  bun run test -- --server
  bun run test -- server         same (-- optional)

  --client  --server  --shared  --crypto-utils  --react  --contracts

Turbo runs upstream check-types first (turbo.json: test dependsOn ^check-types).
So --client may show check-types for dependencies before the client test noop.
`.trim();

function turboTestCmd(filter: string): string[] {
	return ["bunx", "turbo", "run", "test", `--filter=${filter}`];
}

runMain(async () => {
	const argv = scriptArgv();

	if (wantsHelp(argv)) {
		console.log(HELP);
		process.exit(0);
	}

	const filter = parsePackageFilter(argv, die);
	await runInheritExit(rootDir, turboTestCmd(filter));
});
