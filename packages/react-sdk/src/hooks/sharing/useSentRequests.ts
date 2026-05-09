import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useFilosignContext } from "../../context/FilosignProvider";

export function useSentRequests() {
	const { api } = useFilosignContext();

	return useQuery({
		queryKey: ["sent-requests"],
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
				"/sharing/sent",
			);

			return response.data.requests;
		},
		enabled: !!api,
	});
}
