import { eip712signature } from "@filosign/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { useFilosignContext } from "../../context/FilosignProvider";
import { useAuthedApi } from "../auth/useAuthedApi";
import z from "zod";

export function useApproveSender() {
	const { contracts, wallet } = useFilosignContext();
	const { data: api } = useAuthedApi();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { sender: Address }) => {
			const { sender } = args;

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
				},
				"/sharing/approve",
				{
					sender,
					nonce: nonce.toString(),
					deadline: deadline.toString(),
					signature,
				},
			);

			if (!resp.success) throw new Error("Failed to approve sender");

			queryClient.refetchQueries({
				queryKey: ["fsQ-is-approved", wallet?.account.address, sender],
			});
			queryClient.invalidateQueries({ queryKey: ["received-requests"] });
		},
	});
}
