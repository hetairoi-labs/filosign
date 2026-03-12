type BuildOutput = { path: string; kind: string; size: number };

const fmt = (n: number) => `${(n / 1024).toFixed(2)} KB`;
const sum = (a: BuildOutput[]) => a.reduce((s, o) => s + o.size, 0);

export function summary(outputs: BuildOutput[], buildTimeMs: number) {
	const by = (k: string) => outputs.filter((o) => o.kind === k);
	const rest = outputs.filter(
		(o) => o.kind !== "chunk" && o.kind !== "sourcemap",
	);

	const table = [
		...rest.map((o) => ({
			File: o.path.replace(`${process.cwd()}/`, ""),
			Type: o.kind,
			Size: fmt(o.size),
		})),
		...["chunk", "sourcemap"].flatMap((k) => {
			const a = by(k);
			return a.length
				? [{ File: `${k}s (${a.length})`, Type: k, Size: fmt(sum(a)) }]
				: [];
		}),
	];

	console.table(table);
	console.log(
		`Total: ${fmt(sum(outputs))} | Duration: ${buildTimeMs.toFixed(0)}ms`,
	);
}
