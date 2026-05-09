import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthedApi } from "../auth";

export function useUpdateUserProfile() {
	const { data: api } = useAuthedApi();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			email?: string;
			username?: string;
			firstName?: string;
			lastName?: string;
		}) => {
			if (!api) throw new Error("Not reachable");

			await api.rpc.putSafe({}, `/users/profile`, {
				email: args.email,
				username: args.username,
				firstName: args.firstName,
				lastName: args.lastName,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user"] });
		},
	});
}
