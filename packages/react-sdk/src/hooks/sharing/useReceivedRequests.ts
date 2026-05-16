import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type ShareRequestRow =
	InferClientOutputs<AppRouterClient>["sharing"]["receivedRequests"]["requests"][number];

export function useReceivedRequests() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useQuery({
		...rpcQuery.sharing.receivedRequests.queryOptions(),
		enabled: isAuthed,
		select: (data) => data.requests,
	});
}
