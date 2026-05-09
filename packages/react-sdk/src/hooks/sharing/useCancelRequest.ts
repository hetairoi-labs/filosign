import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/FilosignProvider";

export function useCancelRequest() {
	const { api } = useFilosignContext();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (requestId: string) => {
			await api.rpc.deleteSafe({}, `/sharing/${requestId}/cancel`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["received-requests"] });
		},
	});
}
