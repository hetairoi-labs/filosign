import { useMutation } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useRequestApproval() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const { wallet } = useFilosignContext();

	return useMutation({
		mutationFn: async (args: { recipientEmail: string; message?: string }) => {
			if (!wallet || !isAuthed) {
				throw new Error("Wallet not connected or API not authenticated");
			}

			const { recipientEmail, message } = args;

			return rpcQuery.sharing.requestInvite.call({
				inviteeEmail: recipientEmail,
				message,
			});
		},
	});
}
