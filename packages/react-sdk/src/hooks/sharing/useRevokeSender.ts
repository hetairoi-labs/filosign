import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { useFilosignContext } from "../../context/FilosignProvider";

export function useRevokeSender() {
	const { contracts, wallet, api } = useFilosignContext();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (sender: Address) => {
			if (!contracts || !wallet) {
				throw new Error("Not connected to wallet");
			}

			const tx = await contracts.FSManager.write.revokeSender([sender]);
			const success = await api.rpc.tx(tx, {});

			if (!success) {
				throw new Error("Failed to revoke sender");
			}

			queryClient.refetchQueries({
				queryKey: ["fsQ-is-approved", wallet?.account.address, sender],
			});
		},
	});
}
