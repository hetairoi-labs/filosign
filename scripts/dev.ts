#!/usr/bin/env bun
/**
 * Dev stack orchestrator. Spawns workspace dev scripts; does not embed app logic.
 *
 * Usage:
 *   bun run dev                         # local: bootstrap + server + client
 *   bun run dev -- --local              # same
 *   bun run dev -- --local --full       # above + astro
 *   bun run dev -- --testnet            # client + server (staging env)
 *   bun run dev -- --astro              # marketing site only
 *   bun run dev -- --client --local     # client only (no bootstrap)
 *   bun run dev -- --server --local     # bootstrap + API only
 *   bun run dev -- --server --testnet   # API only (staging)
 *   bun run dev -- --help
 */
import { die, runMain, scriptArgv, wantsHelp } from "./lib/cli.ts";
import { runLocalBootstrap } from "./lib/localnode.ts";
import { repoRoot } from "./lib/root.ts";
import { packageRunCmd } from "./lib/run.ts";
import { runParallelExit, type SpawnTask } from "./lib/spawn.ts";

const rootDir = repoRoot(import.meta.url);

type Profile = "local" | "testnet";

const HELP = `
Filosign dev orchestrator

Profiles (env files):
  local    .env.local   — Hardhat + local API
  testnet  .env.staging — Base Sepolia + staging API

Stacks:
  bun run dev                         bootstrap + @filosign/server + @filosign/client
  bun run dev -- --local              same
  bun run dev -- --local --full         above + @filosign/astro
  bun run dev -- --testnet              @filosign/client + @filosign/server (no bootstrap)

Single app (pass a profile when the app needs one):
  bun run dev -- --astro
  bun run dev -- --client --local       Vite only (no chain/DB reset)
  bun run dev -- --server --local       bootstrap + API
  bun run dev -- --server --testnet

Local bootstrap (when server starts on local): Hardhat node, compile, deploy, db purge+push.
`.trim();

function parseArgv(argv: string[]) {
	const flags = new Set<string>();
	let profile: Profile | undefined;

	for (const arg of argv) {
		if (arg === "--help" || arg === "-h") {
			return { help: true as const, flags, profile };
		}
		if (arg === "--serloc") {
			die("Removed --serloc; use bun run dev (local bootstrap is the default)");
		}
		if (arg === "--local") profile = "local";
		if (arg === "--testnet") profile = "testnet";
		if (arg === "--full") flags.add("full");
		if (arg === "--astro") flags.add("astro");
		if (arg === "--client") flags.add("client");
		if (arg === "--server") flags.add("server");
	}

	if (profile === undefined) {
		profile = "local";
	}

	return { help: false as const, flags, profile };
}

function workspaceTask(packageName: string, script: string): SpawnTask {
	return {
		label: packageName,
		cmd: packageRunCmd(rootDir, packageName, script),
	};
}

function serverDevScript(profile: Profile): string {
	return profile === "local" ? "dev:local" : "dev:testnet";
}

function resolveTasks(
	flags: Set<string>,
	profile: Profile | undefined,
): SpawnTask[] {
	const explicit =
		flags.has("client") || flags.has("server") || flags.has("astro");

	if (explicit) {
		const tasks: SpawnTask[] = [];
		const p = profile ?? "local";

		if (flags.has("client")) {
			tasks.push(workspaceTask("@filosign/client", `dev:${p}`));
		}
		if (flags.has("server")) {
			tasks.push(workspaceTask("@filosign/server", serverDevScript(p)));
		}
		if (flags.has("astro")) {
			tasks.push(workspaceTask("@filosign/astro", "dev:local"));
		}

		if (tasks.length === 0) {
			die("Pick at least one of: --client, --server, --astro");
		}
		return tasks;
	}

	if (profile === "local") {
		const tasks: SpawnTask[] = [
			workspaceTask("@filosign/server", "dev:local"),
			workspaceTask("@filosign/client", "dev:local"),
		];
		if (flags.has("full")) {
			tasks.push(workspaceTask("@filosign/astro", "dev:local"));
		}
		return tasks;
	}

	if (profile === "testnet") {
		if (flags.has("full")) die("--full only applies with --local");
		return [
			workspaceTask("@filosign/client", "dev:testnet"),
			workspaceTask("@filosign/server", "dev:testnet"),
		];
	}

	return [];
}

function tasksIncludeServer(tasks: SpawnTask[]): boolean {
	return tasks.some((t) => t.label === "@filosign/server");
}

runMain(async () => {
	const argv = scriptArgv();
	const parsed = parseArgv(argv);

	if (parsed.help || wantsHelp(argv)) {
		console.log(HELP);
		process.exit(0);
	}

	const tasks = resolveTasks(parsed.flags, parsed.profile);

	if (tasks.length === 0) {
		console.error("Missing profile or component. Try: bun run dev -- --help\n");
		console.log(HELP);
		process.exit(1);
	}

	if (parsed.profile === "local" && tasksIncludeServer(tasks)) {
		await runLocalBootstrap(rootDir);
	}

	await runParallelExit(rootDir, tasks);
});
