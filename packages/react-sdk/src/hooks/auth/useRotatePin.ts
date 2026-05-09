import { useMutation } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/FilosignProvider";
import {
	decryptSeedWithPin,
	encryptSeedWithPin,
	loadEnvelope,
	saveEnvelope,
	validatePin,
} from "./pin-storage";

export function useRotatePin() {
	const { wallet } = useFilosignContext();

	return useMutation({
		mutationFn: async (params: { currentPin: string; newPin: string }) => {
			if (!wallet) {
				throw new Error("unreachable");
			}
			if (!validatePin(params.newPin)) {
				throw new Error("PIN must be 6-10 digits");
			}
			const envelope = await loadEnvelope({ wallet: wallet.account.address });
			if (!envelope) {
				throw new Error("Unable to unlock");
			}
			let seed: Uint8Array;
			try {
				seed = await decryptSeedWithPin(params.currentPin, envelope);
			} catch {
				throw new Error("Unable to unlock");
			}
			const nextEnvelope = await encryptSeedWithPin(params.newPin, seed);
			await saveEnvelope({
				wallet: wallet.account.address,
				envelope: nextEnvelope,
			});
			return true;
		},
	});
}
