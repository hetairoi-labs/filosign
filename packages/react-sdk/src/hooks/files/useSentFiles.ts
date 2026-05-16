import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { MINUTE } from "../../constants";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type SentFileRow =
	InferClientOutputs<AppRouterClient>["files"]["list"]["sent"]["files"][number];

export function useSentFiles() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useQuery({
		...rpcQuery.files.list.sent.queryOptions(),
		enabled: isAuthed,
		staleTime: 5 * MINUTE,
		select: (data) => data.files,
	});
}
