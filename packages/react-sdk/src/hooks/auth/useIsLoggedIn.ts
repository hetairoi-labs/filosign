import { seedKeyGen } from "@filosign/crypto-utils";
import { useQuery } from "@tanstack/react-query";
import { DAY } from "../../constants";
import { useFilosignContext } from "../../context/useFilosignContext";
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

			if (!keySeed) {
				return false;
			}

			const keygenData = await seedKeyGen(keySeed, { dl: wasm.dilithium });
			const { commitmentKem, commitmentSig } = storedKeygenData;

			const kemMatch = commitmentKem === keygenData.commitmentKem;
			const sigMatch = commitmentSig === keygenData.commitmentSig;

			if (!kemMatch || !sigMatch) {
				return false;
			}
			return true;
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
