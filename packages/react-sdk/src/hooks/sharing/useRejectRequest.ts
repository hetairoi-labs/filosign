import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/FilosignProvider";

export function useRejectRequest() {
	const { api } = useFilosignContext();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (requestId: string) => {
			await api.rpc.deleteSafe({}, `/sharing/${requestId}/reject`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["received-requests"] });
		},
	});
}
