import type { ComplianceBundle } from "@filosign/shared";
import { zComplianceBundle } from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import { useMutation } from "@tanstack/react-query";
import z from "zod";
import { useAuthedApi } from "../auth/useAuthedApi";

export type ComplianceBundleResponse = {
	exportId: string;
	bundleHash: `0x${string}`;
	bundle: ComplianceBundle;
};

export function useComplianceBundle() {
	const { data: api } = useAuthedApi();

	return useMutation({
		mutationKey: ["fsM-compliance-bundle"],
		mutationFn: async (args: {
			pieceCid: string;
			documentSha256?: string | undefined;
		}): Promise<ComplianceBundleResponse> => {
			if (!api) throw new Error("API not ready");
			const q =
				args.documentSha256 !== undefined && args.documentSha256 !== ""
					? `?documentSha256=${encodeURIComponent(args.documentSha256)}`
					: "";
			const response = await api.rpc.getSafe(
				{
					exportId: z.string().uuid(),
					bundleHash: zHexString(),
					bundle: zComplianceBundle,
				},
				`/files/${args.pieceCid}/compliance-bundle${q}`,
			);
			return response.data;
		},
	});
}
