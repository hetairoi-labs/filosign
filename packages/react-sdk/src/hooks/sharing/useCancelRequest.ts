import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useCancelRequest() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (requestId: string) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.sharing.cancelRequest.call({ id: requestId });
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.sharing.sentRequests.key(),
			});
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.sharing.receivedRequests.key(),
			});
		},
	});
}
