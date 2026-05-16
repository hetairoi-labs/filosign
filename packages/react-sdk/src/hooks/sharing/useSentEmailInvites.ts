import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type SentEmailInviteRow =
	InferClientOutputs<AppRouterClient>["sharing"]["emailInvites"]["invites"][number];

export function useSentEmailInvites() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useQuery({
		...rpcQuery.sharing.emailInvites.queryOptions(),
		enabled: isAuthed,
		select: (data) => data.invites,
	});
}
