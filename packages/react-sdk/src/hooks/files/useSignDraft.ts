import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import z from "zod";
import { useAuthedApi } from "../auth/useAuthedApi";

const zDraftResponse = {
	completedFieldIds: z.array(z.string()),
};

export function useSignDraft(pieceCid: string | undefined) {
	const { data: api } = useAuthedApi();

	return useQuery({
		queryKey: ["fsQ-sign-draft", pieceCid],
		queryFn: async () => {
			if (!api || !pieceCid) {
				throw new Error("API or pieceCid missing");
			}
			const response = await api.rpc.getSafe(
				zDraftResponse,
				`/files/${pieceCid}/sign-draft`,
			);
			return response.data.completedFieldIds;
		},
		enabled: !!pieceCid && !!api,
	});
}

export function useUpdateSignDraft() {
	const queryClient = useQueryClient();
	const { data: api } = useAuthedApi();

	return useMutation({
		mutationFn: async (args: {
			pieceCid: string;
			completedFieldIds: string[];
		}) => {
			if (!api) {
				throw new Error("API not ready");
			}
			const response = await api.rpc.putSafe(
				zDraftResponse,
				`/files/${args.pieceCid}/sign-draft`,
				{ completedFieldIds: args.completedFieldIds },
			);
			return response.data.completedFieldIds;
		},
		onSuccess: (_data, variables) => {
			queryClient.setQueryData(
				["fsQ-sign-draft", variables.pieceCid],
				variables.completedFieldIds,
			);
		},
	});
}
