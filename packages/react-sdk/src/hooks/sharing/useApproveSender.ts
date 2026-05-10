import { eip712signature } from "@filosign/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import z from "zod";
import { useFilosignContext } from "../../context/useFilosignContext";
import { useAuthedApi } from "../auth/useAuthedApi";

export function useApproveSender() {
	const { contracts, wallet } = useFilosignContext();
	const { data: api } = useAuthedApi();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			sender: Address;
			/** After approving sender A, insert pending share request so A can approve you (mutual connection). */
			establishMutualConnection?: boolean;
			/** Validates POST body against this incoming pending request when establishing mutual connection. */
			shareRequestId?: string;
		}) => {
			const { sender, establishMutualConnection, shareRequestId } = args;

			if (!contracts || !wallet || !api) {
				throw new Error("not connected");
			}

			const recipient = wallet.account.address;
			const nonce = await contracts.FSManager.read.approveNonce([recipient]);
			const deadline = BigInt(Math.floor(Date.now() / 1000) + 10 * 60);

			const signature = await eip712signature(contracts, "FSManager", {
				types: {
					ApproveSender: [
						{ name: "recipient", type: "address" },
						{ name: "sender", type: "address" },
						{ name: "nonce", type: "uint256" },
						{ name: "deadline", type: "uint256" },
					],
				},
				primaryType: "ApproveSender",
				message: {
					recipient,
					sender,
					nonce: BigInt(nonce),
					deadline,
				},
			});

			const resp = await api.rpc.postSafe(
				{
					txHash: z.string(),
					reciprocalCreated: z.boolean().optional(),
				},
				"/sharing/approve",
				{
					sender,
					nonce: nonce.toString(),
					deadline: deadline.toString(),
					signature,
					...(establishMutualConnection
						? { establishMutualConnection: true }
						: {}),
					...(shareRequestId ? { shareRequestId } : {}),
				},
			);

			if (!resp.success) throw new Error("Failed to approve sender");

			queryClient.refetchQueries({
				queryKey: ["fsQ-is-approved", wallet?.account.address, sender],
			});
			queryClient.invalidateQueries({ queryKey: ["received-requests"] });
			queryClient.invalidateQueries({ queryKey: ["sent-requests"] });
			queryClient.invalidateQueries({ queryKey: ["sendable-to"] });
			queryClient.invalidateQueries({ queryKey: ["receivable-from"] });
			queryClient.invalidateQueries({ queryKey: ["accepted-recipients"] });
			queryClient.invalidateQueries({ queryKey: ["accepted-people"] });
		},
	});
}
