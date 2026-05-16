import { eip712signature } from "@filosign/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { filosignKeys } from "../../lib/query-keys";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useApproveSender() {
	const { contracts, wallet } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			sender: Address;
			establishMutualConnection?: boolean;
			shareRequestId?: string;
		}) => {
			const { sender, establishMutualConnection, shareRequestId } = args;

			if (!contracts || !wallet || !isAuthed) {
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

			const result = await rpcQuery.sharing.approve.call({
				sender,
				nonce: nonce.toString(),
				deadline: deadline.toString(),
				signature,
				...(establishMutualConnection
					? { establishMutualConnection: true }
					: {}),
				...(shareRequestId ? { shareRequestId } : {}),
			});

			queryClient.refetchQueries({
				queryKey: filosignKeys.isApprovedWalletFirst(
					wallet.account.address,
					sender,
				),
			});
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.sharing.key(),
			});

			return result;
		},
	});
}
