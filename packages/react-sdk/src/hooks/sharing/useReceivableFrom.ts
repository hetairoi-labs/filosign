import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useAuthedApi } from "../auth/useAuthedApi";

export type ReceivableApprovalRow =
	InferClientOutputs<AppRouterClient>["sharing"]["receivableFrom"]["approvals"][number];

export function useReceivableFrom() {
	const { data: auth } = useAuthedApi();

	return useQuery({
		queryKey: ["receivable-from"],
		queryFn: async () => {
			if (!auth) throw new Error("API is unreachable");
			const raw = await auth.rpc.sharing.receivableFrom();
			return raw.approvals;
		},
		enabled: !!auth,
	});
}
