import type { InferClientOutputs } from "@orpc/client";
import { useQueries } from "@tanstack/react-query";
import type { Address } from "viem";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useAuthedApi } from "../auth/useAuthedApi";

export type ProfileByAddress =
	InferClientOutputs<AppRouterClient>["users"]["profile"]["lookup"];

export function useProfilesByAddresses(addresses: Address[] | undefined) {
	const { data: auth } = useAuthedApi();

	const queries = useQueries({
		queries: (addresses ?? []).map((address) => ({
			queryKey: ["fsQ-user-info-by-address", address],
			queryFn: async () => {
				if (!auth) throw new Error("API not ready");
				const userInfo = await auth.rpc.users.profile.lookup({
					query: address,
				});
				return { address, profile: userInfo };
			},
			enabled: !!auth && !!address,
		})),
	});

	const map = new Map<Address, ProfileByAddress>();
	const addrs = addresses ?? [];
	for (let i = 0; i < addrs.length; i++) {
		const q = queries[i];
		const addr = addrs[i];
		if (q?.data && addr) map.set(addr, q.data.profile);
	}

	return {
		data: map,
		isLoading: queries.some((q) => q.isLoading),
		isError: queries.some((q) => q.isError),
	};
}
