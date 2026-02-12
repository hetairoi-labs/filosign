import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useAuthedApi } from "../auth/useAuthedApi";

export function useReceivedRequests() {
	const { data: api } = useAuthedApi();

	return useQuery({
		queryKey: ["received-requests"],
		queryFn: async () => {
			const response = await api.rpc.getSafe(
				{
					requests: z.array(
						z.object({
							id: z.string(),
							senderWallet: z.string(),
							recipientWallet: z.string(),
							message: z.string().nullable(),
							status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"]),
							createdAt: z.string(),
							updatedAt: z.string(),
						}),
					),
				},
				"/sharing/received",
			);

			return response.data.requests;
		},
		enabled: !!api,
	});
}
