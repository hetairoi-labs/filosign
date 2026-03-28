import path from "node:path";
import type { BunPlugin } from "bun";

/** Served by dev `server.ts` and copied into `dist/` by `bundler.ts`. */
export const IDKIT_WASM_PUBLIC_PATH =
	"/vendor/worldcoin-idkit-core/idkit_wasm_bg.wasm";

const wasmUrlPattern =
	/new URL\(\s*(["'])idkit_wasm_bg\.wasm\1\s*,\s*import\.meta\.url\s*\)/g;

/**
 * `@worldcoin/idkit-core` loads WASM via `new URL("idkit_wasm_bg.wasm", import.meta.url)`.
 * After bundling, `import.meta.url` points at a chunk URL; the relative WASM path must be
 * rewritten to a stable origin path so fetch uses http(s), not file://.
 */
const idkitWasmPlugin: BunPlugin = {
	name: "idkit-wasm-url",
	setup(build) {
		build.onLoad({ filter: /\.(js|mjs|cjs)$/ }, async (args) => {
			if (
				!args.path.includes(
					`${path.sep}@worldcoin${path.sep}idkit-core${path.sep}`,
				)
			) {
				return undefined;
			}
			let text = await Bun.file(args.path).text();
			if (!text.includes("idkit_wasm_bg.wasm")) {
				return undefined;
			}
			text = text.replace(
				wasmUrlPattern,
				`new URL("${IDKIT_WASM_PUBLIC_PATH}", import.meta.url)`,
			);
			return {
				contents: text,
				loader: "js",
			};
		});
	},
};

export default idkitWasmPlugin;
