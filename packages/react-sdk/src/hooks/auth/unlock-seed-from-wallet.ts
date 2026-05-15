import type { FilosignContracts } from "@filosign/contracts";
import {
	deriveDeterministicSeed32,
	expandDeterministicSeed,
	seedKeyGen,
} from "@filosign/crypto-utils";
import type { UseWalletClientReturnType } from "wagmi";
import type { FilosignContextValue } from "../../context/FilosignContext";

type Wallet = NonNullable<UseWalletClientReturnType["data"]>;

/**
 * Re-derives the seed via the same path as registration (`walletKeyGen`).
 * Returns `null` if signing fails, commitments mismatch, or chain data is missing.
 */
export async function unlockSeedFromWallet(args: {
	wallet: Wallet;
	contracts: FilosignContracts;
	wasm: FilosignContextValue["wasm"];
}): Promise<Uint8Array | null> {
	const { wallet, contracts, wasm } = args;

	try {
		const [, saltSeed, saltChallenge, commitmentKem, commitmentSig] =
			await contracts.FSKeyRegistry.read.keygenData([wallet.account.address]);

		if (!saltSeed || !saltChallenge || !commitmentKem || !commitmentSig) {
			return null;
		}

		const seedCore32 = await deriveDeterministicSeed32(wallet, {
			saltChallenge,
			saltSeed,
		});
		const seed = await expandDeterministicSeed(seedCore32);
		const keygenData = await seedKeyGen(new Uint8Array(Array.from(seed)), {
			dl: wasm.dilithium,
		});

		if (
			commitmentKem !== keygenData.commitmentKem ||
			commitmentSig !== keygenData.commitmentSig
		) {
			return null;
		}

		return seed;
	} catch {
		return null;
	}
}
