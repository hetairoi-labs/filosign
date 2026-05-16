import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { DAY } from "../../constants";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export type UserProfile =
	InferClientOutputs<AppRouterClient>["users"]["profile"]["me"];

export async function fetchUserProfile(
	rpc: AppRouterClient,
): Promise<UserProfile> {
	return rpc.users.profile.me();
}

export function useUserProfile() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useQuery({
		...rpcQuery.users.profile.me.queryOptions(),
		enabled: isAuthed,
		staleTime: 1 * DAY,
	});
}
