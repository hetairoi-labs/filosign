import { die } from "./cli.ts";
import { packageRunCmd } from "./run.ts";
import { runInherit } from "./spawn.ts";

const HARDHAT_RPC = "http://127.0.0.1:8545";

async function hardhatNodeRunning(): Promise<boolean> {
	try {
		const res = await fetch(HARDHAT_RPC, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				method: "eth_blockNumber",
				params: [],
				id: 1,
			}),
			signal: AbortSignal.timeout(1000),
		});
		return res.ok;
	} catch {
		return false;
	}
}

/** Start Hardhat JSON-RPC on :8545 if nothing is listening (no deploy/DB). */
export async function ensureHardhatNode(rootDir: string): Promise<void> {
	if (await hardhatNodeRunning()) {
		console.log("Hardhat node already running on :8545\n");
		return;
	}

	console.log("Starting Hardhat node on :8545…\n");
	Bun.spawn({
		cmd: packageRunCmd(rootDir, "@filosign/contracts", "node"),
		cwd: rootDir,
		stdout: "inherit",
		stderr: "inherit",
		stdin: "ignore",
	});

	for (let i = 0; i < 30; i++) {
		await Bun.sleep(500);
		if (await hardhatNodeRunning()) {
			console.log("Hardhat node ready\n");
			return;
		}
	}

	die("Hardhat node did not become ready on :8545");
}

/** Full local reset: node, compile, deploy, db purge+push. */
export async function runLocalBootstrap(rootDir: string): Promise<void> {
	await ensureHardhatNode(rootDir);

	const steps: string[][] = [
		["bun", "run", "contracts", "--", "compile"],
		["bun", "run", "contracts", "--", "--deploy", "--local"],
		["bun", "run", "db", "--", "purge", "local"],
	];

	for (const cmd of steps) {
		const code = await runInherit(rootDir, cmd);
		if (code !== 0) process.exit(code);
	}

	console.log("Local bootstrap finished\n");
}
