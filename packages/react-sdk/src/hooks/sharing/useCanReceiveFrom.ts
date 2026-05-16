import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { filosignKeys } from "../../lib/query-keys";

export function useCanReceiveFrom(args: { sender: Address }) {
	const { sender } = args;
	const { contracts, wallet } = useFilosignContext();

	return useQuery({
		queryKey: filosignKeys.isApprovedDependentFirst(
			sender,
			wallet?.account.address,
		),
		queryFn: async () => {
			if (!contracts || !wallet) return false;
			const isApproved = await contracts.FSManager.read.approvedSenders([
				wallet.account.address,
				sender,
			]);
			return isApproved;
		},
		enabled: !!wallet && !!contracts,
	});
}
