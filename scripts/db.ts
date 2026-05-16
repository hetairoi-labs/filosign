#!/usr/bin/env bun
/**
 * Database ops via @filosign/server scripts.
 *
 * Usage:
 *   bun run db -- push local
 *   bun run db -- push testnet
 *   bun run db -- purge local
 *   bun run db -- purge testnet
 *   bun run db -- --help
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { packageRunCmd } from "./lib/bun-run-package.ts";

const rootDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

const HELP = `
Filosign database orchestrator (@filosign/server)

  bun run db -- push local      drizzle push (.env.local)
  bun run db -- push testnet    drizzle push (.env.staging)
  bun run db -- purge local     clear DB (.env.local)
  bun run db -- purge testnet   clear DB (.env.staging)
`.trim();

type Action = "push" | "purge";
type Profile = "local" | "testnet";

function scriptFor(action: Action, profile: Profile): string {
	return `db:${action}:${profile}`;
}

async function main() {
	const argv = process.argv.slice(2);

	if (argv.includes("--help") || argv.includes("-h") || argv.length === 0) {
		console.log(HELP);
		process.exit(argv.length === 0 ? 1 : 0);
	}

	const action = argv[0] as Action;
	const profile = argv[1] as Profile;

	if (action !== "push" && action !== "purge") {
		console.error(`Unknown action: ${action}`);
		process.exit(1);
	}
	if (profile !== "local" && profile !== "testnet") {
		console.error(`Unknown profile: ${profile}`);
		process.exit(1);
	}

	const script = scriptFor(action, profile);
	const proc = Bun.spawn({
		cmd: packageRunCmd(rootDir, "@filosign/server", script),
		cwd: rootDir,
		stdout: "inherit",
		stderr: "inherit",
		stdin: "inherit",
		env: process.env,
	});

	const code = await proc.exited;
	process.exit(code ?? 1);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
