import { zHexString } from "@filosign/shared/zod";
import { useQueries } from "@tanstack/react-query";
import type { Address } from "viem";
import z from "zod";
import { useAuthedApi } from "../auth/useAuthedApi";

export type ProfileByAddress = {
	walletAddress: `0x${string}`;
	encryptionPublicKey: `0x${string}`;
	lastActiveAt: string;
	createdAt: string;
	firstName: string | null;
	lastName: string | null;
	avatarUrl: string | null;
	has: { email: boolean; mobile: boolean };
};

export function useProfilesByAddresses(addresses: Address[] | undefined) {
	const { data: api } = useAuthedApi();

	const queries = useQueries({
		queries: (addresses ?? []).map((address) => ({
			queryKey: ["fsQ-user-info-by-address", address],
			queryFn: async () => {
				if (!api) throw new Error("API not ready");
				const userInfo = await api.rpc.getSafe(
					{
						walletAddress: zHexString(),
						encryptionPublicKey: zHexString(),
						lastActiveAt: z.string(),
						createdAt: z.string(),
						firstName: z.string().nullable(),
						lastName: z.string().nullable(),
						avatarUrl: z.string().nullable(),
						has: z.object({
							email: z.boolean(),
							mobile: z.boolean(),
						}),
					},
					`/users/profile/${address}`,
				);
				return { address, profile: userInfo.data } as {
					address: Address;
					profile: ProfileByAddress;
				};
			},
			enabled: !!api && !!address,
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
