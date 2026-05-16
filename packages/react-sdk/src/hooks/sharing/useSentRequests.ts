import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export type SentShareRequestRow =
	InferClientOutputs<AppRouterClient>["sharing"]["sentRequests"]["requests"][number];

export function useSentRequests() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useQuery({
		...rpcQuery.sharing.sentRequests.queryOptions(),
		enabled: isAuthed,
		select: (data) => data.requests,
	});
}
