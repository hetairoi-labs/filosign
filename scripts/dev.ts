#!/usr/bin/env bun
/**
 * Dev stack orchestrator. Spawns workspace dev scripts; does not embed app logic.
 *
 * Usage:
 *   bun run dev -- --local              # serloc + client
 *   bun run dev -- --local --full       # + astro
 *   bun run dev -- --testnet            # client + server (staging env)
 *   bun run dev -- --astro              # marketing site only
 *   bun run dev -- --client --local     # client only
 *   bun run dev -- --server --testnet   # API only
 *   bun run dev -- --help
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { packageRunCmd } from "./lib/bun-run-package.ts";

const rootDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

type Profile = "local" | "testnet";

type Task = {
	label: string;
	cmd: string[];
};

const HELP = `
Filosign dev orchestrator

Profiles (env files):
  local    .env.local   — Hardhat + local API (serloc)
  testnet  .env.staging — Base Sepolia + staging API

Stacks:
  bun run dev -- --local              serloc + @filosign/client
  bun run dev -- --local --full         above + @filosign/astro
  bun run dev -- --testnet              @filosign/client + @filosign/server

Single app (pass a profile when the app needs one):
  bun run dev -- --astro
  bun run dev -- --client --local
  bun run dev -- --server --testnet

Aliases: dev:local, dev:local:full, dev:testnet (see root package.json)

serloc is interactive (r / R / q). It runs in parallel with other processes on --local.
`.trim();

function parseArgv(argv: string[]) {
	const flags = new Set<string>();
	let profile: Profile | undefined;

	for (const arg of argv) {
		if (arg === "--help" || arg === "-h") {
			return { help: true as const, flags, profile };
		}
		if (arg === "--local") profile = "local";
		if (arg === "--testnet") profile = "testnet";
		if (arg === "--full") flags.add("full");
		if (arg === "--astro") flags.add("astro");
		if (arg === "--client") flags.add("client");
		if (arg === "--server") flags.add("server");
		if (arg === "--serloc") flags.add("serloc");
	}

	return { help: false as const, flags, profile };
}

function workspaceScript(packageName: string, script: string): Task {
	return {
		label: packageName,
		cmd: packageRunCmd(rootDir, packageName, script),
	};
}

function rootScript(script: string): Task {
	return {
		label: script,
		cmd: ["bun", "run", script],
	};
}

function resolveTasks(
	flags: Set<string>,
	profile: Profile | undefined,
): Task[] {
	const explicit =
		flags.has("client") ||
		flags.has("server") ||
		flags.has("astro") ||
		flags.has("serloc");

	if (explicit) {
		const tasks: Task[] = [];
		const p = profile ?? "local";

		if (flags.has("serloc")) {
			if (p !== "local") {
				console.error("serloc only supports --local");
				process.exit(1);
			}
			tasks.push(rootScript("serloc"));
		}
		if (flags.has("client")) {
			tasks.push(workspaceScript("@filosign/client", `dev:${p}`));
		}
		if (flags.has("server")) {
			if (p !== "testnet") {
				console.error("server dev uses --testnet (staging env)");
				process.exit(1);
			}
			tasks.push(workspaceScript("@filosign/server", "dev:testnet"));
		}
		if (flags.has("astro")) {
			tasks.push(workspaceScript("@filosign/astro", "dev:local"));
		}

		if (tasks.length === 0) {
			console.error(
				"Pick at least one of: --client, --server, --astro, --serloc",
			);
			process.exit(1);
		}
		return tasks;
	}

	if (flags.has("astro") && !profile) {
		return [workspaceScript("@filosign/astro", "dev:local")];
	}

	if (profile === "local") {
		const tasks: Task[] = [
			rootScript("serloc"),
			workspaceScript("@filosign/client", "dev:local"),
		];
		if (flags.has("full")) {
			tasks.push(workspaceScript("@filosign/astro", "dev:local"));
		}
		return tasks;
	}

	if (profile === "testnet") {
		if (flags.has("full")) {
			console.error("--full only applies with --local");
			process.exit(1);
		}
		return [
			workspaceScript("@filosign/client", "dev:testnet"),
			workspaceScript("@filosign/server", "dev:testnet"),
		];
	}

	return [];
}

async function main() {
	const argv = process.argv.slice(2);
	const parsed = parseArgv(argv);

	if (parsed.help) {
		console.log(HELP);
		process.exit(0);
	}

	const tasks = resolveTasks(parsed.flags, parsed.profile);

	if (tasks.length === 0) {
		console.error("Missing profile or component. Try: bun run dev -- --help\n");
		console.log(HELP);
		process.exit(1);
	}

	console.log(`Starting: ${tasks.map((t) => t.label).join(", ")}\n`);

	const children = tasks.map((task) =>
		Bun.spawn({
			cmd: task.cmd,
			cwd: rootDir,
			stdout: "inherit",
			stderr: "inherit",
			stdin: "inherit",
			env: process.env,
		}),
	);

	const killAll = () => {
		for (const child of children) {
			if (!child.killed) child.kill();
		}
	};

	process.on("SIGINT", () => {
		killAll();
		process.exit(130);
	});
	process.on("SIGTERM", killAll);

	const codes = await Promise.all(children.map((c) => c.exited));
	const failed = codes.find((code) => code !== 0);
	process.exit(failed ?? 0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
