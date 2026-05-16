import { useQuery } from "@tanstack/react-query";
import { MINUTE } from "../../constants";
import { useAuthedApi } from "../auth";

export function useUpdateUserProfilePrevalidate(args: {
	email?: string;
	username?: string;
}) {
	const { data: auth } = useAuthedApi();

	return useQuery({
		queryKey: ["fsQ-user-profile-prevalidate", args],
		queryFn: async () => {
			if (!auth) throw new Error("Not reachable");

			return auth.rpc.users.profile.prevalidate({
				...(args.email !== undefined ? { email: args.email } : {}),
				...(args.username !== undefined ? { username: args.username } : {}),
			});
		},
		enabled: !!auth,
		staleTime: 5 * MINUTE,
	});
}
