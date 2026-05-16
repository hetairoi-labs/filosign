import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { DAY } from "../../constants";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useAuthedApi } from "../auth";

export type UserProfile =
	InferClientOutputs<AppRouterClient>["users"]["profile"]["me"];

export async function fetchUserProfile(
	rpc: AppRouterClient,
): Promise<UserProfile> {
	return rpc.users.profile.me();
}

export function useUserProfile() {
	const { data: auth } = useAuthedApi();

	return useQuery({
		queryKey: ["user"],
		queryFn: async () => {
			if (!auth) throw new Error("Unreachable");
			return fetchUserProfile(auth.rpc);
		},
		staleTime: 1 * DAY,
		enabled: !!auth,
	});
}
