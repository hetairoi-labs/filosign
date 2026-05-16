import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useAuthedApi } from "../auth/useAuthedApi";

export type ShareRequestRow =
	InferClientOutputs<AppRouterClient>["sharing"]["receivedRequests"]["requests"][number];

export function useReceivedRequests() {
	const { data: auth } = useAuthedApi();

	return useQuery({
		queryKey: ["received-requests"],
		queryFn: async () => {
			if (!auth) throw new Error("API is unreachable");
			const raw = await auth.rpc.sharing.receivedRequests();
			return raw.requests;
		},
		enabled: !!auth,
	});
}
