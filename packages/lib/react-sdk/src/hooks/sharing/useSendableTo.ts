import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useAuthedApi } from "../auth/useAuthedApi";

export function useSendableTo() {
	const { data: api } = useAuthedApi();

	return useQuery({
		queryKey: ["sendable-to"],
		queryFn: async () => {
			const response = await api.rpc.getSafe(
				{
					approvals: z.array(
						z.object({
							recipientWallet: z.string(),
							active: z.boolean(),
							createdAt: z.string(),
						}),
					),
				},
				"/sharing/sendable-to",
			);
			return response.data.approvals;
		},
		enabled: !!api,
	});
}

// Hook to get people who have accepted your requests (for envelope creation)
export function useAcceptedRecipients() {
	const { data: api } = useAuthedApi();

	return useQuery({
		queryKey: ["accepted-recipients"],
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
				"/sharing/sent", // This would need to be added to show sent requests
			);
			// Filter for accepted requests
			return response.data.requests.filter((req) => req.status === "ACCEPTED");
		},
		enabled: !!api,
	});
}
