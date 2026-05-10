import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthedApi } from "../auth";

export function useSetPrimaryEmail() {
	const { data: api } = useAuthedApi();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { identityToken: string; email: string }) => {
			if (!api) throw new Error("Not reachable");

			await api.rpc.postSafe({}, `/users/profile/set-primary-email`, {
				identityToken: args.identityToken,
				email: args.email,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user"] });
		},
	});
}
