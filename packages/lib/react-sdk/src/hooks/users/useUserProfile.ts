import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { DAY } from "../../constants";
import { useAuthedApi } from "../auth";

export function useUserProfile() {
	const { data: api } = useAuthedApi();

	return useQuery({
		queryKey: ["user"],
		queryFn: async () => {
			if (!api) throw new Error("Noreachable");
			const user = await api.rpc.getSafe(
				{
					walletAddress: z.string(),
					encryptionPublicKey: z.string(),
					keygenData: z.any().nullable(),
					createdAt: z.string(),
					email: z.string().nullable(),
					username: z.string().nullable(),
					firstName: z.string().nullable(),
					lastName: z.string().nullable(),
					avatarUrl: z.string().nullable(),
					subscriptionStatus: z.string().nullable(),
					subscriptionId: z.string().nullable(),
					subscriptionExpiry: z.string().nullable(),
					lastActiveAt: z.string().nullable(),
				},
				`/users/profile`,
			);
			return user.data;
		},
		staleTime: 1 * DAY,
		enabled: !!api,
	});
}
