import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export type ReceivedFileRow =
	InferClientOutputs<AppRouterClient>["files"]["list"]["received"]["files"][number];

export function useReceivedFiles() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useQuery({
		...rpcQuery.files.list.received.queryOptions(),
		enabled: isAuthed,
		select: (data) => data.files,
	});
}
