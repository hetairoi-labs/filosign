import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";

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
			queryClient.invalidateQueries({ queryKey: ["received-requests"] });
			queryClient.invalidateQueries({ queryKey: ["sent-requests"] });
			queryClient.invalidateQueries({ queryKey: ["sendable-to"] });
			queryClient.invalidateQueries({ queryKey: ["receivable-from"] });
			queryClient.invalidateQueries({ queryKey: ["accepted-people"] });
			queryClient.invalidateQueries({ queryKey: ["accepted-recipients"] });
		},
	});
}
