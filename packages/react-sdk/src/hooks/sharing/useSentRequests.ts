import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useAuthedApi } from "../auth/useAuthedApi";

export type SentShareRequestRow =
	InferClientOutputs<AppRouterClient>["sharing"]["sentRequests"]["requests"][number];

export function useSentRequests() {
	const { data: auth } = useAuthedApi();

	return useQuery({
		queryKey: ["sent-requests"],
		queryFn: async () => {
			if (!auth) throw new Error("API is unreachable");

			const raw = await auth.rpc.sharing.sentRequests();
			return raw.requests;
		},
		enabled: !!auth,
	});
}
