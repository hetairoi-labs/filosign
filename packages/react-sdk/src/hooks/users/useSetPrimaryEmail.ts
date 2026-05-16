import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthedApi } from "../auth";

export function useSetPrimaryEmail() {
	const { data: auth } = useAuthedApi();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { identityToken: string; email: string }) => {
			if (!auth) throw new Error("Not reachable");

			await auth.rpc.users.profile.setPrimaryEmail({
				identityToken: args.identityToken,
				email: args.email,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user"] });
		},
	});
}
