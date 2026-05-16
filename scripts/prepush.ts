#!/usr/bin/env bun
/**
 * Pre-push (local): Biome --write, then sanity (read-only + tests).
 * If Biome changes files, exit so you commit fixes before pushing.
 */
import { repoRoot } from "./lib/root.ts";
import { runInherit } from "./lib/spawn.ts";

const rootDir = repoRoot(import.meta.url);

function gitQuiet(args: string[]): boolean {
	const proc = Bun.spawnSync({
		cmd: ["git", ...args],
		cwd: rootDir,
		stdout: "ignore",
		stderr: "ignore",
	});
	return proc.exitCode === 0;
}

const lintCode = await runInherit(rootDir, [
	"bun",
	"run",
	"check",
	"--",
	"--lint",
]);
if (lintCode !== 0) process.exit(lintCode);

const dirty =
	!gitQuiet(["diff", "--quiet"]) || !gitQuiet(["diff", "--cached", "--quiet"]);
if (dirty) {
	console.error("\nBiome updated files — stage, commit, then push again.\n");
	process.exit(1);
}

process.exit(await runInherit(rootDir, ["bun", "run", "sanity"]));
