/**
 * In-memory session seed only (JavaScript `Map`).
 *
 * We intentionally do **not** persist the decrypted seed to `sessionStorage`:
 * same-origin XSS could read it there across navigations. After a full page
 * reload the seed is gone and the user must unlock again (PIN / recovery flow).
 */
const LEGACY_TAB_SEED_PREFIX = "fs_tab_seed:";

function clearLegacyTabSeedFromSessionStorage(): void {
	if (typeof window === "undefined") return;
	try {
		const keys: string[] = [];
		for (let i = 0; i < window.sessionStorage.length; i++) {
			const k = window.sessionStorage.key(i);
			if (k?.startsWith(LEGACY_TAB_SEED_PREFIX)) keys.push(k);
		}
		for (const k of keys) window.sessionStorage.removeItem(k);
	} catch {
		/* quota / private mode */
	}
}

clearLegacyTabSeedFromSessionStorage();

const sessionSeedByWallet = new Map<string, Uint8Array<ArrayBufferLike>>();

export function setSessionSeed(
	wallet: string,
	seed: Uint8Array<ArrayBufferLike>,
) {
	const key = wallet.toLowerCase();
	sessionSeedByWallet.set(key, new Uint8Array(seed));
}

export function getSessionSeed(wallet: string) {
	const seed = sessionSeedByWallet.get(wallet.toLowerCase());
	return seed ? new Uint8Array(seed) : undefined;
}

export function clearSessionSeed(wallet: string) {
	sessionSeedByWallet.delete(wallet.toLowerCase());
}
