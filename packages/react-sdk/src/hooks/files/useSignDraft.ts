import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useSignDraft(pieceCid: string | undefined) {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useQuery({
		...rpcQuery.files.piece.signDraftGet.queryOptions({
			input: { pieceCid: pieceCid ?? "" },
		}),
		enabled: isAuthed && !!pieceCid,
		select: (data) => data.completedFieldIds,
	});
}

export function useUpdateSignDraft() {
	const queryClient = useQueryClient();
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async (args: {
			pieceCid: string;
			completedFieldIds: string[];
		}) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.files.piece.signDraftPut.call({
				pieceCid: args.pieceCid,
				body: { completedFieldIds: args.completedFieldIds },
			});
		},
		onSuccess: (data, variables) => {
			queryClient.setQueryData(
				rpcQuery.files.piece.signDraftGet.queryKey({
					input: { pieceCid: variables.pieceCid },
				}),
				data,
			);
		},
	});
}
