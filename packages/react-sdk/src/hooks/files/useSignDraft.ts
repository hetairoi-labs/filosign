import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthedApi } from "../auth/useAuthedApi";

export function useSignDraft(pieceCid: string | undefined) {
	const { data: auth } = useAuthedApi();

	return useQuery({
		queryKey: ["fsQ-sign-draft", pieceCid],
		queryFn: async () => {
			if (!auth || !pieceCid) {
				throw new Error("API or pieceCid missing");
			}
			const raw = await auth.rpc.files.piece.signDraftGet({ pieceCid });
			return raw.completedFieldIds;
		},
		enabled: !!pieceCid && !!auth,
	});
}

export function useUpdateSignDraft() {
	const queryClient = useQueryClient();
	const { data: auth } = useAuthedApi();

	return useMutation({
		mutationFn: async (args: {
			pieceCid: string;
			completedFieldIds: string[];
		}) => {
			if (!auth) {
				throw new Error("API not ready");
			}
			const raw = await auth.rpc.files.piece.signDraftPut({
				pieceCid: args.pieceCid,
				body: { completedFieldIds: args.completedFieldIds },
			});
			return raw.completedFieldIds;
		},
		onSuccess: (_data, variables) => {
			queryClient.setQueryData(
				["fsQ-sign-draft", variables.pieceCid],
				variables.completedFieldIds,
			);
		},
	});
}
