import { useQuery } from "@tanstack/react-query";
import { MINUTE } from "../../constants";
import { useFilosignContext } from "../../context/FilosignProvider";

export function useIsRegistered() {
	const { contracts, wallet } = useFilosignContext();

	return useQuery({
		queryKey: ["fsQ-is-registered", wallet?.account.address],
		queryFn: async () => {
			if (!contracts || !wallet) {
				throw new Error("No contracts or wallet");
			}

			try {
				console.log("FSKeyRegistry address", contracts.FSKeyRegistry.address);
				const isRegistered = await contracts.FSKeyRegistry.read.isRegistered([
					wallet.account.address,
				]);
				return isRegistered;
			} catch (error) {
				console.error("Failed to check if user is registered", error);
				throw error;
			}
		},
		staleTime: 5 * MINUTE,
		enabled: !!contracts && !!wallet?.account.address,
	});
}
