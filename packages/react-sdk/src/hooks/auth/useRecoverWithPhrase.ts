import { seedKeyGen } from "@filosign/crypto-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { filosignKeys } from "../../lib/query-keys";
import { seedFromRecoveryPhrase } from "./recovery-phrase";
import { setSessionSeed } from "./session-seed";

export function useRecoverWithPhrase() {
	const { wallet, contracts, wasm } = useFilosignContext();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (params: { phrase: string }) => {
			if (!wallet || !contracts || !wasm.dilithium) {
				throw new Error("unreachable");
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

			setSessionSeed(wallet.account.address, seed);
			await queryClient.refetchQueries({
				queryKey: filosignKeys.isLoggedIn(wallet.account.address),
			});
			return true;
		},
	});
}
