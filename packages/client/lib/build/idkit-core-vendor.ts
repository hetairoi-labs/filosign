import path from "node:path";
import { fileURLToPath } from "node:url";

export function getIdkitCoreDistDir(): string {
	const resolved = import.meta.resolve("@worldcoin/idkit-core/package.json");
	const pkgRoot = path.dirname(fileURLToPath(new URL(resolved)));
	return path.join(pkgRoot, "dist");
}

export function getIdkitWasmSourcePath(): string {
	return path.join(getIdkitCoreDistDir(), "idkit_wasm_bg.wasm");
}
