import { seedKeyGen } from "@filosign/crypto-utils";
import { useQuery } from "@tanstack/react-query";
import { DAY } from "../../constants";
import { useFilosignContext } from "../../context/FilosignProvider";
import { loadEnvelope } from "./pin-storage";
import { getSessionSeed } from "./session-seed";
import { useIsRegistered } from "./useIsRegistered";
import { useStoredKeygenData } from "./useStoredKeygenData";

export function useIsLoggedIn() {
	const { wallet, contracts, wasm } = useFilosignContext();
	const { data: isRegistered } = useIsRegistered();
	const { data: storedKeygenData } = useStoredKeygenData();

	return useQuery({
		queryKey: ["fsQ-is-logged-in", wallet?.account.address],
		queryFn: async () => {
			if (!wallet || !contracts || !wasm.dilithium) {
				return false;
			}
			if (!isRegistered || !storedKeygenData) {
				return false;
			}

			const keySeed = getSessionSeed(wallet.account.address);

			// If we have a session seed (from server-side session restore), validate it
			if (keySeed) {
				const keygenData = await seedKeyGen(keySeed, { dl: wasm.dilithium });
				const { commitmentKem, commitmentSig } = storedKeygenData;

				const kemMatch = commitmentKem === keygenData.commitmentKem;
				const sigMatch = commitmentSig === keygenData.commitmentSig;

				if (!kemMatch || !sigMatch) {
					return false;
				}
				return true;
			}

			// Otherwise, check if we can unlock with PIN (envelope exists)
			const envelope = await loadEnvelope({ wallet: wallet.account.address });
			if (!envelope) return false;

			return false; // Have envelope but no seed yet - need PIN login
		},
		staleTime: 1 * DAY,
		enabled:
			!!wallet &&
			!!contracts &&
			!!wasm.dilithium &&
			!!isRegistered &&
			!!storedKeygenData,
	});
}
