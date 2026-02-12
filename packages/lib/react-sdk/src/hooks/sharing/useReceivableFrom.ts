import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useAuthedApi } from "../auth/useAuthedApi";

export function useReceivableFrom() {
	const { data: api } = useAuthedApi();

	return useQuery({
		queryKey: ["receivable-from"],
		queryFn: async () => {
			const response = await api.rpc.getSafe(
				{
					approvals: z.array(
						z.object({
							senderWallet: z.string(),
							active: z.boolean(),
							createdAt: z.string(),
						}),
					),
				},
				"/sharing/receivable-from",
			);
			return response.data.approvals;
		},
		enabled: !!api,
	});
}
