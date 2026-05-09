import { zHexString } from "@filosign/shared/zod";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import z from "zod";
import { DAY } from "../../constants";
import { useAuthedApi } from "../auth";

export function useUserProfileByQuery(query: {
	address?: Address | undefined;
	email?: string | undefined;
	username?: string | undefined;
}) {
	const { data: api } = useAuthedApi();

	return useQuery({
		queryKey: ["fsQ-user-info-by-address", query],
		queryFn: async () => {
			if ((!query.address && !query.username && !query.email) || !api)
				throw new Error("Not unreachable");

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
				`/users/profile/${query.address ?? query.username ?? query.email}`,
			);

			return userInfo.data;
		},
		enabled: (!!query.address || !!query.username || !!query.email) && !!api,
		staleTime: 1 * DAY,
	});
}
