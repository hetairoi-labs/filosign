import { seedKeyGen } from "@filosign/crypto-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/FilosignProvider";
import {
	encryptSeedWithPin,
	resetAttempts,
	saveEnvelope,
	seedFromRecoveryPhrase,
	validatePin,
} from "./pin-storage";
import { setSessionSeed } from "./session-seed";

export function useRecoverWithPhrase() {
	const { wallet, contracts, wasm } = useFilosignContext();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (params: { phrase: string; newPin: string }) => {
			if (!wallet || !contracts || !wasm.dilithium) {
				throw new Error("unreachable");
			}
			if (!validatePin(params.newPin)) {
				throw new Error("PIN must be 6-10 digits");
			}
			const seed = await seedFromRecoveryPhrase(params.phrase);
			const keygenData = await seedKeyGen(new Uint8Array(Array.from(seed)), {
				dl: wasm.dilithium,
			});
			const [, , , commitmentKem, commitmentSig] =
				await contracts.FSKeyRegistry.read.keygenData([wallet.account.address]);

			if (
				commitmentKem !== keygenData.commitmentKem ||
				commitmentSig !== keygenData.commitmentSig
			) {
				throw new Error("Unable to unlock");
			}

			const envelope = await encryptSeedWithPin(params.newPin, seed);
			await saveEnvelope({ wallet: wallet.account.address, envelope });
			await resetAttempts({ wallet: wallet.account.address });
			setSessionSeed(wallet.account.address, seed);
			await queryClient.refetchQueries({
				queryKey: ["fsQ-is-logged-in", wallet.account.address],
			});
			return true;
		},
	});
}
