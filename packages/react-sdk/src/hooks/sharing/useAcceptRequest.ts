import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/FilosignProvider";

export function useAcceptRequest() {
	const { api } = useFilosignContext();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { requestId: string }) => {
			const { requestId } = args;

			const response = await api.rpc.postSafe(
				{},
				`/sharing/${requestId}/accept`,
				{},
			);

			return response.success;
		},
		onSuccess: () => {
			// Invalidate received requests and approvals
			queryClient.invalidateQueries({
				queryKey: ["received-requests"],
			});
			queryClient.invalidateQueries({
				queryKey: ["received-approvals"],
			});
		},
	});
}
