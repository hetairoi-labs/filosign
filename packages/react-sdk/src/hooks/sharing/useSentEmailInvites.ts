import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useAuthedApi } from "../auth/useAuthedApi";

export type SentEmailInviteRow =
	InferClientOutputs<AppRouterClient>["sharing"]["emailInvites"]["invites"][number];

export function useSentEmailInvites() {
	const { data: auth } = useAuthedApi();

	return useQuery({
		queryKey: ["sent-email-invites"],
		queryFn: async () => {
			if (!auth) throw new Error("API is unreachable");
			const raw = await auth.rpc.sharing.emailInvites();
			return raw.invites;
		},
		enabled: !!auth,
	});
}
