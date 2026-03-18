import { useMutation } from "@tanstack/react-query";
import z from "zod";
import { useFilosignContext } from "../../context/FilosignProvider";

export function useCreateCheckout() {
	const { api } = useFilosignContext();

	return useMutation({
		mutationFn: async () => {
			const response = await api.rpc.postSafe(
				{
					checkoutId: z.string(),
					checkoutUrl: z.string(),
				},
				`payments/checkout/create`,
			);
			return response.data;
		},
	});
}
