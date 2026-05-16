import { useMutation } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { useAuthedApi } from "../auth/useAuthedApi";

export function useRequestApproval() {
	const { data: auth } = useAuthedApi();
	const { wallet } = useFilosignContext();

	return useMutation({
		mutationFn: async (args: { recipientEmail: string; message?: string }) => {
			if (!wallet || !auth) {
				throw new Error("Wallet not connected or API not authenticated");
			}

			const { recipientEmail, message } = args;

			return auth.rpc.sharing.requestInvite({
				inviteeEmail: recipientEmail,
				message,
			});
		},
	});
}
