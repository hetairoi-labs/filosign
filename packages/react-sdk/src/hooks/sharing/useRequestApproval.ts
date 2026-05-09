import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useFilosignContext } from "../../context/useFilosignContext";
import { useAuthedApi } from "../auth/useAuthedApi";

export function useRequestApproval() {
	const { data: api } = useAuthedApi();
	const { wallet } = useFilosignContext();

	return useMutation({
		mutationFn: async (args: { recipientEmail: string; message?: string }) => {
			if (!wallet || !api) {
				throw new Error("Wallet not connected or API not authenticated");
			}

			const { recipientEmail, message } = args;

			const response = await api.rpc.postSafe(
				{
					exists: z.boolean().optional(),
					requested: z.boolean().optional(),
					invited: z.boolean().optional(),
					alreadyApproved: z.boolean().optional(),
					alreadyRequested: z.boolean().optional(),
					alreadyInvited: z.boolean().optional(),
				},
				"/sharing/request/invite",
				{
					inviteeEmail: recipientEmail,
					message,
				},
			);

			return response.data;
		},
	});
}
