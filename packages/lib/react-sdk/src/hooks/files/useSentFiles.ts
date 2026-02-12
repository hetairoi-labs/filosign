import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { MINUTE } from "../../constants";
import { useAuthedApi } from "../auth/useAuthedApi";

export function useSentFiles() {
	const { data: api } = useAuthedApi();

	return useQuery({
		queryKey: ["sent-files"],
		queryFn: async () => {
			const response = await api.rpc.getSafe(
				{
					files: z.array(
						z.object({
							pieceCid: z.string(),
							sender: z.string(),
							status: z.string(),
						}),
					),
				},
				"/files/sent",
			);

			return response.data.files;
		},
		enabled: !!api,
		staleTime: 5 * MINUTE,
	});
}
