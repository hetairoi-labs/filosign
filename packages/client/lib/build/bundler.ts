import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import tailwindPlugin from "bun-plugin-tailwind";
import { safeAsync } from "../utils/safe";
import { dilithiumPlugin } from "./dilithium";
import { fixHtml } from "./fix-html";
import { getIdkitWasmSourcePath } from "./idkit-core-vendor";
import idkitWasmPlugin from "./idkit-wasm-plugin";

const outdir = `${process.cwd()}/dist`;
const entrypoints = [`${process.cwd()}/src/index.html`];

export async function bundle() {
	console.log("Building project...");
	await safeAsync(rm(outdir, { recursive: true, force: true }));

	const start = performance.now();
	const result = await Bun.build({
		entrypoints,
		outdir,
		target: "browser",
		minify: true,
		sourcemap: "linked",
		env: "BUN_PUBLIC_*",
		define: {
			"process.env.NODE_ENV": JSON.stringify("production"),
		},
		plugins: [tailwindPlugin, dilithiumPlugin, idkitWasmPlugin],
		splitting: true,
		naming: {
			chunk: "chunks/[name]-[hash].[ext]",
			asset: "assets/[name]-[hash].[ext]",
			entry: "[name].[ext]",
		},
	});

	if (result.logs.length > 0) {
		for (const msg of result.logs) console.warn(msg);
	}

	const publicDir = `${process.cwd()}/public`;
	await safeAsync(cp(publicDir, `${outdir}/static`, { recursive: true }));

	const idkitWasmOut = path.join(
		outdir,
		"vendor/worldcoin-idkit-core/idkit_wasm_bg.wasm",
	);
	await safeAsync(rm(idkitWasmOut, { force: true }));
	await safeAsync(mkdir(path.dirname(idkitWasmOut), { recursive: true }));
	await safeAsync(cp(getIdkitWasmSourcePath(), idkitWasmOut));

	await fixHtml(result.outputs, outdir);

	return { result, duration: performance.now() - start };
}
