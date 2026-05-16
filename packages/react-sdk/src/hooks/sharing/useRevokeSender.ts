import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { filosignKeys } from "../../lib/query-keys";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useRevokeSender() {
	const { contracts, wallet } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (sender: Address) => {
			if (!contracts || !wallet || !isAuthed) {
				throw new Error("Not connected to wallet");
			}

			const txHash = await contracts.FSManager.write.revokeSender([sender]);
			await rpcQuery.tx.processIndexerHash.call({ hash: txHash });

			queryClient.refetchQueries({
				queryKey: filosignKeys.isApprovedWalletFirst(
					wallet.account.address,
					sender,
				),
			});
		},
	});
}
