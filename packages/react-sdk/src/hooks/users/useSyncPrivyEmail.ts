import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthedApi } from "../auth";

export function useSyncPrivyEmail() {
	const { data: api } = useAuthedApi();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { identityToken: string }) => {
			if (!api) throw new Error("Not reachable");

			await api.rpc.postSafe({}, `/users/profile/sync-privy-email`, {
				identityToken: args.identityToken,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user"] });
		},
	});
}
