import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthedApi } from "../auth/useAuthedApi";

export function useRejectRequest() {
	const { data: auth } = useAuthedApi();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (requestId: string) => {
			if (!auth) throw new Error("Not authenticated");
			await auth.rpc.sharing.rejectRequest({ id: requestId });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["received-requests"] });
			queryClient.invalidateQueries({ queryKey: ["sent-requests"] });
		},
	});
}
