import { useQuery } from "@tanstack/react-query";
import { DAY } from "../../constants";
import { useFilosignContext } from "../../context/FilosignProvider";

export function useStoredKeygenData() {
	const { wallet, contracts } = useFilosignContext();

	return useQuery({
		queryKey: ["fsQ-stored-keygen-data", wallet?.account.address],
		queryFn: async () => {
			if (!wallet || !contracts) {
				throw new Error("unreachable");
			}

			const [saltPin, saltSeed, saltChallenge, commitmentKem, commitmentSig] =
				await contracts.FSKeyRegistry.read.keygenData([wallet.account.address]);

			if (
				!saltPin ||
				!saltSeed ||
				!saltChallenge ||
				!commitmentKem ||
				!commitmentSig
			)
				return undefined;

			return {
				saltPin,
				saltSeed,
				saltChallenge,
				commitmentKem,
				commitmentSig,
			};
		},
		staleTime: 1 * DAY,
		enabled: !!wallet && !!contracts,
	});
}
