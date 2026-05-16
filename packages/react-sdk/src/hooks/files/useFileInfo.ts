import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export type FileInfo =
	InferClientOutputs<AppRouterClient>["files"]["piece"]["detail"];

export function useFileInfo(args: { pieceCid: string | undefined }) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const pieceCid = args.pieceCid;

	return useQuery({
		...rpcQuery.files.piece.detail.queryOptions({
			input: { pieceCid: pieceCid ?? "" },
		}),
		enabled: isAuthed && !!pieceCid,
	});
}
