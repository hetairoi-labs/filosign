import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export type SendableApprovalRow =
	InferClientOutputs<AppRouterClient>["sharing"]["sendableTo"]["approvals"][number];

export function useSendableTo() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useQuery({
		...rpcQuery.sharing.sendableTo.queryOptions(),
		enabled: isAuthed,
		select: (data) => data.approvals,
	});
}

export function useAcceptedRecipients() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useQuery({
		...rpcQuery.sharing.sentRequests.queryOptions(),
		enabled: isAuthed,
		select: (data) => data.requests.filter((req) => req.status === "ACCEPTED"),
	});
}
