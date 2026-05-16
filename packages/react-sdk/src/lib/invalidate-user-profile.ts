import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import type { FilosignRpcQueryUtils } from "../context/FilosignContext";
import { useFilosignContext } from "../context/useFilosignContext";

export function invalidateUserProfile(
	queryClient: QueryClient,
	rpcQuery: FilosignRpcQueryUtils,
) {
	return queryClient.invalidateQueries({
		queryKey: rpcQuery.users.profile.me.key(),
	});
}

export function useInvalidateUserProfile() {
	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	return () => {
		void invalidateUserProfile(queryClient, rpcQuery);
	};
}
