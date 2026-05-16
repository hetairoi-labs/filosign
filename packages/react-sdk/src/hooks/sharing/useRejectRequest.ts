import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useRejectRequest() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (requestId: string) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.sharing.rejectRequest.call({ id: requestId });
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.sharing.receivedRequests.key(),
			});
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.sharing.sentRequests.key(),
			});
		},
	});
}
