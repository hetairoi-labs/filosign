import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useAuthedApi } from "../auth/useAuthedApi";

export type FileInfo =
	InferClientOutputs<AppRouterClient>["files"]["piece"]["detail"];

export function useFileInfo(args: { pieceCid: string | undefined }) {
	const { data: auth } = useAuthedApi();

	return useQuery<FileInfo>({
		queryKey: ["fsQ-file-info", args.pieceCid],
		queryFn: async (): Promise<FileInfo> => {
			if (!auth) throw new Error("API not ready");
			const pieceCid = args.pieceCid;
			if (!pieceCid) throw new Error("pieceCid required");
			return auth.rpc.files.piece.detail({
				pieceCid,
			});
		},
		enabled: !!args.pieceCid && !!auth,
	});
}
