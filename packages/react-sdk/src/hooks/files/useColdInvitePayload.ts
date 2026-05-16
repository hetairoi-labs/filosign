import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type ColdInvitePayload =
	InferClientOutputs<AppRouterClient>["files"]["coldInvite"]["inviteByToken"];

export function useColdInvitePayload(inviteToken: string | undefined) {
	const { rpcQuery, ready } = useFilosignContext();
	const token = inviteToken?.trim();

	return useQuery({
		...rpcQuery.files.coldInvite.inviteByToken.queryOptions({
			input: { inviteToken: token ?? "" },
		}),
		enabled: Boolean(ready && token && token.length >= 8),
		staleTime: 60_000,
	});
}
