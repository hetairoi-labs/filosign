import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { MINUTE } from "../../constants";
import { useAuthedApi } from "../auth";

export function useUpdateUserProfilePrevalidate(args: {
	email?: string;
	username?: string;
}) {
	const { data: api } = useAuthedApi();

	return useQuery({
		queryKey: ["fsQ-user-profile-prevalidate", args],
		queryFn: async () => {
			if (!api) throw new Error("Not reachable");

			const { email, username } = args;

			const prevalidateResponse = await api.rpc.getSafe(
				{
					valid: z.boolean(),
				},
				`/users/profile/prevalidate?${new URLSearchParams({
					...(email ? { email } : {}),
					...(username ? { username } : {}),
				})}`,
			);

			return prevalidateResponse.data;
		},
		enabled: !!api,
		staleTime: 5 * MINUTE,
	});
}
