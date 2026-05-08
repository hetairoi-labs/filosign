import { useFilosignContext } from "../../context/FilosignProvider";
import { getSessionSeed } from "./session-seed";

export function useCryptoSeed() {
	const { wallet, wasm } = useFilosignContext();

	async function action<T>(fn: (seed: Uint8Array<ArrayBuffer>) => T) {
		while (!wasm.dilithium) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
		if (!wallet) {
			throw new Error("No wallet available");
		}
		const keySeed = getSessionSeed(wallet.account.address);
		if (!keySeed)
			throw new Error(
				"No unlocked key seed found, most probably not logged in",
			);
		return fn(new Uint8Array(keySeed));
	}

	return { action };
}
