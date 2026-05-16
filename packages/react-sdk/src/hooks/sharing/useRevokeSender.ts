import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { useAuthedApi } from "../auth/useAuthedApi";

export function useRevokeSender() {
	const { contracts, wallet } = useFilosignContext();
	const { data: auth } = useAuthedApi();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (sender: Address) => {
			if (!contracts || !wallet || !auth) {
				throw new Error("Not connected to wallet");
			}

			const txHash = await contracts.FSManager.write.revokeSender([sender]);
			await auth.rpc.tx.processIndexerHash({ hash: txHash });

			queryClient.refetchQueries({
				queryKey: ["fsQ-is-approved", wallet?.account.address, sender],
			});
		},
	});
}
