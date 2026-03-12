import type { BunPlugin } from "bun";

export const dilithiumPlugin: BunPlugin = {
	name: "dilithium",
	setup(build) {
		build.onLoad({ filter: /\.([jt]sx?)$/ }, async (args) => {
			const text = await Bun.file(args.path).text();

			if (
				text.includes('from "dilithium-crystals-js"') ||
				text.includes("from 'dilithium-crystals-js'")
			) {
				const fixed = text.replace(
					/import\s+(\w+)\s+from\s+["']dilithium-crystals-js["']/g,
					'import { createDilithium } from "dilithium-crystals-js"; const $1 = createDilithium()',
				);

				return {
					contents: fixed,
					loader: args.path.endsWith(".tsx")
						? "tsx"
						: args.path.endsWith(".ts")
							? "ts"
							: args.path.endsWith(".jsx")
								? "jsx"
								: "js",
				};
			}
		});
	},
};
