import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import z from "zod";
import { MINUTE } from "../../constants";
import { useFilosignContext } from "../../context/FilosignProvider";

export function useCanSendTo(args: { recipient: Address }) {
	const { recipient } = args;
	const { api, wallet } = useFilosignContext();

	return useQuery({
		queryKey: ["fsQ-is-approved", recipient, wallet?.account.address],
		queryFn: async () => {
			if (!api || !wallet) return false;

			const response = await api.rpc.getSafe(
				{
					canSend: z.boolean(),
					reason: z.string().nullable(),
				},
				`/sharing/can-send-to?recipient=${recipient}`,
			);

			return response.data.canSend;
		},
		enabled: !!wallet && !!api,
		staleTime: 5 * MINUTE,
	});
}
