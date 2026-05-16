/** CLI argv and help handling for root orchestrator scripts. */

export function scriptArgv(): string[] {
	return process.argv.slice(2);
}

export function wantsHelp(argv: string[]): boolean {
	return argv.includes("--help") || argv.includes("-h");
}

/** Print help; exit 0 for `--help`, 1 when argv is empty. */
export function exitOnHelpOrEmpty(help: string, argv: string[]): void {
	if (wantsHelp(argv)) {
		console.log(help);
		process.exit(0);
	}
	if (argv.length === 0) {
		console.log(help);
		process.exit(1);
	}
}

export function die(message: string): never {
	console.error(message);
	process.exit(1);
}

export function runMain(fn: () => void | Promise<void>): void {
	Promise.resolve(fn()).catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
