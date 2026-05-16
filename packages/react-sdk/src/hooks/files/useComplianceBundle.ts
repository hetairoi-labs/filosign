import type { InferClientOutputs } from "@orpc/client";
import { useMutation } from "@tanstack/react-query";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useAuthedApi } from "../auth/useAuthedApi";

export type ComplianceBundleResponse =
	InferClientOutputs<AppRouterClient>["files"]["piece"]["complianceBundle"];

export function useComplianceBundle() {
	const { data: auth } = useAuthedApi();

	return useMutation({
		mutationKey: ["fsM-compliance-bundle"],
		mutationFn: async (args: {
			pieceCid: string;
			documentSha256?: string | undefined;
		}): Promise<ComplianceBundleResponse> => {
			if (!auth) throw new Error("API not ready");
			return auth.rpc.files.piece.complianceBundle({
				pieceCid: args.pieceCid,
				...(args.documentSha256 !== undefined && args.documentSha256 !== ""
					? { documentSha256: args.documentSha256 }
					: {}),
			});
		},
	});
}
