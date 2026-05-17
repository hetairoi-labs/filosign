import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { FilosignRpcQueryUtils } from "../context/FilosignContext";
import { useFilosignContext } from "../context/useFilosignContext";
import { useFilosignRpc } from "./use-filosign-rpc";

export function invalidateEntitlements(
	queryClient: QueryClient,
	rpcQuery: FilosignRpcQueryUtils,
) {
	return queryClient.invalidateQueries({
		queryKey: rpcQuery.billing.entitlements.key(),
	});
}

export function useInvalidateEntitlements() {
	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	return () => {
		void invalidateEntitlements(queryClient, rpcQuery);
	};
}

/** Refetch billing limits when a screen mounts (e.g. envelope compose). */
export function useRefetchEntitlementsOnMount() {
	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	const { isAuthed } = useFilosignRpc();

	useEffect(() => {
		if (!isAuthed) return;
		void invalidateEntitlements(queryClient, rpcQuery);
	}, [isAuthed, queryClient, rpcQuery]);
}
