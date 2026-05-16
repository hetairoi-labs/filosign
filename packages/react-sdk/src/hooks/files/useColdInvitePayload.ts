import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type ColdInvitePayload =
	InferClientOutputs<AppRouterClient>["files"]["coldInvite"]["inviteByToken"];

export function useColdInvitePayload(inviteToken: string | undefined) {
	const { rpc, ready } = useFilosignContext();

	return useQuery({
		queryKey: ["fsQ-cold-invite", inviteToken],
		queryFn: async (): Promise<ColdInvitePayload> => {
			if (!inviteToken?.trim()) {
				throw new Error("Missing invite token");
			}
			return rpc.files.coldInvite.inviteByToken({
				inviteToken: inviteToken.trim(),
			});
		},
		enabled: Boolean(ready && inviteToken && inviteToken.length >= 8),
		staleTime: 60_000,
	});
}
