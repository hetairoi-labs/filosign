import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { MINUTE } from "../../constants";
import { useFilosignContext } from "../../context/useFilosignContext";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useCanSendTo(args: { recipient: Address }) {
	const { recipient } = args;
	const { wallet } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useQuery({
		...rpcQuery.sharing.canSendTo.queryOptions({
			input: { recipient },
		}),
		enabled: !!wallet && isAuthed,
		staleTime: 5 * MINUTE,
		select: (data) => data.canSend,
	});
}
