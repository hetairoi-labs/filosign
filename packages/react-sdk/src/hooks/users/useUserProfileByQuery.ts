import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { DAY } from "../../constants";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useAuthedApi } from "../auth";

export type UserProfileLookup =
	InferClientOutputs<AppRouterClient>["users"]["profile"]["lookup"];

export function useUserProfileByQuery(query: {
	address?: Address | undefined;
	email?: string | undefined;
	username?: string | undefined;
}) {
	const { data: auth } = useAuthedApi();

	return useQuery({
		queryKey: ["fsQ-user-profile-by-query", query],
		queryFn: async () => {
			if ((!query.address && !query.username && !query.email) || !auth) {
				throw new Error("Not unreachable");
			}

			const q = query.address ?? query.username ?? query.email ?? "";

			return auth.rpc.users.profile.lookup({ query: q });
		},
		enabled: (!!query.address || !!query.username || !!query.email) && !!auth,
		staleTime: 1 * DAY,
	});
}
