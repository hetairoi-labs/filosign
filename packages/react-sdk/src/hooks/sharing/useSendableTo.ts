import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useAuthedApi } from "../auth/useAuthedApi";

export type SendableApprovalRow =
	InferClientOutputs<AppRouterClient>["sharing"]["sendableTo"]["approvals"][number];

export function useSendableTo() {
	const { data: auth } = useAuthedApi();

	return useQuery({
		queryKey: ["sendable-to"],
		queryFn: async () => {
			if (!auth) throw new Error("API is unreachable");
			const raw = await auth.rpc.sharing.sendableTo();
			return raw.approvals;
		},
		enabled: !!auth,
	});
}

// Hook to get people who have accepted your requests (for envelope creation)
export function useAcceptedRecipients() {
	const { data: auth } = useAuthedApi();

	return useQuery({
		queryKey: ["accepted-recipients"],
		queryFn: async () => {
			if (!auth) throw new Error("API is unreachable");
			const raw = await auth.rpc.sharing.sentRequests();
			return raw.requests.filter((req) => req.status === "ACCEPTED");
		},
		enabled: !!auth,
	});
}
