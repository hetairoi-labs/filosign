#!/usr/bin/env bun
/**
 * @filosign/emails orchestrator (React Email templates).
 *
 * Usage:
 *   bun run emails -- dev           preview server (email dev, port 30012)
 *   bun run emails -- test          package unit tests
 *   bun run emails -- check-types   tsc --noEmit
 *   bun run emails -- --help
 */
import { die, exitOnHelpOrEmpty, runMain, scriptArgv } from "./lib/cli.ts";
import { repoRoot } from "./lib/root.ts";
import { packageRunCmd } from "./lib/run.ts";
import { runInheritExit } from "./lib/spawn.ts";

const rootDir = repoRoot(import.meta.url);
const EMAILS = "@filosign/emails";

const HELP = `
Filosign emails orchestrator (@filosign/emails)

  bun run emails -- dev           React Email preview (localhost:30012)
  bun run emails -- test          bun test (render snapshots)
  bun run emails -- check-types   tsc --noEmit
`.trim();

type Action = "dev" | "test" | "check-types";

const ACTIONS: Record<Action, string> = {
	dev: "dev",
	test: "test",
	"check-types": "check-types",
};

runMain(async () => {
	const argv = scriptArgv();
	exitOnHelpOrEmpty(HELP, argv);

	const action = argv[0] as Action;
	const script = ACTIONS[action];
	if (!script) {
		die(`Unknown action: ${action ?? "(none)"}`);
	}

	await runInheritExit(rootDir, packageRunCmd(rootDir, EMAILS, script));
});
