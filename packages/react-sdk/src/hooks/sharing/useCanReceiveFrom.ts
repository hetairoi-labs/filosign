import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { useFilosignContext } from "../../context/FilosignProvider";

export function useCanReceiveFrom(args: { sender: Address }) {
	const { sender } = args;
	const { contracts, wallet } = useFilosignContext();

	return useQuery({
		queryKey: ["fsQ-is-approved", sender, wallet?.account.address],
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
