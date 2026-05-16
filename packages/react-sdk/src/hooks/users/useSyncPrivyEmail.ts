import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthedApi } from "../auth";

export function useSyncPrivyEmail() {
	const { data: auth } = useAuthedApi();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { identityToken: string }) => {
			if (!auth) throw new Error("Not reachable");

			await auth.rpc.users.profile.syncPrivyEmail({
				identityToken: args.identityToken,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user"] });
		},
	});
}
