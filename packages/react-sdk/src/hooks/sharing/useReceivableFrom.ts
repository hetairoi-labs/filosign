import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type ReceivableApprovalRow =
	InferClientOutputs<AppRouterClient>["sharing"]["receivableFrom"]["approvals"][number];

export function useReceivableFrom() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useQuery({
		...rpcQuery.sharing.receivableFrom.queryOptions(),
		enabled: isAuthed,
		select: (data) => data.approvals,
	});
}
