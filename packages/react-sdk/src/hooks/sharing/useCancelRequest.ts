import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthedApi } from "../auth/useAuthedApi";

export function useCancelRequest() {
	const { data: auth } = useAuthedApi();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (requestId: string) => {
			if (!auth) throw new Error("Not authenticated");
			await auth.rpc.sharing.cancelRequest({ id: requestId });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["sent-requests"] });
			queryClient.invalidateQueries({ queryKey: ["received-requests"] });
		},
	});
}
