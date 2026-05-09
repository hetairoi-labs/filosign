const sessionSeedByWallet = new Map<string, Uint8Array<ArrayBufferLike>>();

function tabSeedStorageKey(wallet: string) {
	return `fs_tab_seed:${wallet.toLowerCase()}`;
}

function writeTabSeed(wallet: string, seed: Uint8Array) {
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage.setItem(
			tabSeedStorageKey(wallet),
			JSON.stringify(Array.from(seed)),
		);
	} catch {
		// private mode, quota exceeded
	}
}

function removeTabSeed(wallet: string) {
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage.removeItem(tabSeedStorageKey(wallet));
	} catch {
		/* ignore */
	}
}

/**
 * Loads seed from `sessionStorage` into memory if present (same browser tab).
 * Survives full page refresh; cleared when the tab is closed.
 */
export function tryHydrateSessionSeedFromTabStorage(wallet: string): void {
	if (typeof window === "undefined") return;
	const key = wallet.toLowerCase();
	if (sessionSeedByWallet.has(key)) return;

	let raw: string | null;
	try {
		raw = window.sessionStorage.getItem(tabSeedStorageKey(wallet));
	} catch {
		return;
	}
	if (!raw) return;

	try {
		const arr = JSON.parse(raw) as unknown;
		if (!Array.isArray(arr) || arr.some((n) => typeof n !== "number")) {
			throw new Error("invalid seed shape");
		}
		const seed = new Uint8Array(arr);
		sessionSeedByWallet.set(key, seed);
	} catch {
		removeTabSeed(wallet);
	}
}

export function setSessionSeed(
	wallet: string,
	seed: Uint8Array<ArrayBufferLike>,
) {
	const key = wallet.toLowerCase();
	sessionSeedByWallet.set(key, new Uint8Array(seed));
	writeTabSeed(wallet, new Uint8Array(seed));
}

export function getSessionSeed(wallet: string) {
	const seed = sessionSeedByWallet.get(wallet.toLowerCase());
	return seed ? new Uint8Array(seed) : undefined;
}

export function clearSessionSeed(wallet: string) {
	sessionSeedByWallet.delete(wallet.toLowerCase());
	removeTabSeed(wallet);
}
