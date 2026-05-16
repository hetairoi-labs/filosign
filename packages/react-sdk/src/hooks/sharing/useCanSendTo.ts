import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { MINUTE } from "../../constants";
import { useFilosignContext } from "../../context/useFilosignContext";
import { useAuthedApi } from "../auth/useAuthedApi";

export function useCanSendTo(args: { recipient: Address }) {
	const { recipient } = args;
	const { wallet } = useFilosignContext();
	const { data: auth } = useAuthedApi();

	return useQuery({
		queryKey: ["fsQ-is-approved", recipient, wallet?.account.address],
		queryFn: async () => {
			if (!auth || !wallet) return false;

			const raw = await auth.rpc.sharing.canSendTo({ recipient });
			return raw.canSend;
		},
		enabled: !!wallet && !!auth,
		staleTime: 5 * MINUTE,
	});
}
