/** Canonical WASM URL (bundlers emit a hashed asset URL in client/test builds). */
export const dilithiumWasmUrl = new URL(
	"../../assets/dilithium.wasm",
	import.meta.url,
).href;

/** API surface from dilithium-crystals-js used by FilosignProvider `wasm.dilithium`. */
export type BrowserDilithium = {
	generateKeys: (
		kind: unknown,
		seed: Uint8Array,
	) => { publicKey: Uint8Array; privateKey: Uint8Array };
	sign: (
		message: Uint8Array,
		privateKey: Uint8Array,
		kind: unknown,
	) => { signature: Uint8Array };
	verify: (
		signature: Uint8Array,
		message: Uint8Array,
		publicKey: Uint8Array,
		kind: unknown,
	) => { result: number };
	DILITHIUM_PARAMS?: unknown;
};

function installDilithiumWasmUrlMock(wasmUrl: string) {
	(
		globalThis as {
			chrome?: { runtime: { getURL: (path: string) => string } };
		}
	).chrome = {
		runtime: {
			getURL: (path: string) => (path.endsWith(".wasm") ? wasmUrl : path),
		},
	};
}

/**
 * Load Dilithium for browser (client, test harness).
 * Uses patched dilithium-crystals-js browser entry + canonical crypto-utils WASM.
 */
export async function loadBrowserDilithium(): Promise<BrowserDilithium> {
	installDilithiumWasmUrlMock(dilithiumWasmUrl);

	const mod = await import("dilithium-crystals-js");

	if ("createDilithium" in mod && typeof mod.createDilithium === "function") {
		return (await mod.createDilithium()) as BrowserDilithium;
	}

	if ("default" in mod) {
		const d = mod.default;
		if (typeof d === "function") {
			return (await d()) as BrowserDilithium;
		}
		if (d && typeof d === "object" && "then" in d) {
			return d as unknown as BrowserDilithium;
		}
		return d as BrowserDilithium;
	}

	throw new Error(
		"dilithium-crystals-js: expected createDilithium or default export",
	);
}
