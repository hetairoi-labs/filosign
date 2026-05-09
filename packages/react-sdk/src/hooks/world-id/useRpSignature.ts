import { useMutation } from "@tanstack/react-query";
import z from "zod";
import { useFilosignContext } from "../../context/FilosignProvider";

export function useRpSignature() {
	const { api } = useFilosignContext();

	return useMutation({
		mutationFn: async (args: { action: string }) => {
			const { data } = await api.rpc.postSafe(
				{
					rp_id: z.string(),
					nonce: z.string(),
					created_at: z.number(),
					expires_at: z.number(),
					signature: z.string(),
				},
				"/world-id/rp-context",
				{
					action: args.action,
				},
			);

			return data;
		},
	});
}

export type RpSignatureResponse = Awaited<
	ReturnType<typeof useRpSignature>
>["data"];
