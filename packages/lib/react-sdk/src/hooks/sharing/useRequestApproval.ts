import { useMutation } from "@tanstack/react-query";
import { type Address, isAddress } from "viem";
import { z } from "zod";
import { useFilosignContext } from "../../context/FilosignProvider";
import { useAuthedApi } from "../auth/useAuthedApi";

export function useRequestApproval() {
	const { data: api } = useAuthedApi();
	const { wallet } = useFilosignContext();

	return useMutation({
		mutationFn: async (args: {
			recipientWallet?: Address;
			recipientEmail?: string;
			message?: string;
		}) => {
			if (!wallet || !api) {
				throw new Error("Wallet not connected or API not authenticated");
			}

			const { recipientEmail, message } = args;
			let recipientWallet = args.recipientWallet;

			if (!recipientWallet && !recipientEmail) {
				throw new Error(
					"Either recipientWallet or recipientEmail must be provided",
				);
			}

			if (recipientEmail && recipientWallet) {
				throw new Error(
					"Provide only one of recipientWallet or recipientEmail",
				);
			}

			if (recipientEmail) {
				const response = await api.rpc.base.post("/sharing/request/invite", {
					inviteeEmail: recipientEmail,
				});
				const data = await response.data();

				if (
					response.status === 303 &&
					data.data?.address &&
					isAddress(data.data?.address)
				) {
					recipientWallet = data.data?.address as Address;
				} else if (response.status === 201) {
					return { recipientWallet, message };
				} else {
					throw new Error(
						`Failed to get recipient wallet for email: ${response.status} ${data}`,
					);
				}
			}

			const response = await api.rpc.postSafe(
				{
					id: z.string(),
					senderWallet: z.string(),
					recipientWallet: z.string(),
					message: z.string().nullable(),
					status: z.string(),
					createdAt: z.string(),
				},
				"/sharing/request",
				{
					recipientWallet,
					message: message || null,
				},
			);

			return response.data;
		},
	});
}
