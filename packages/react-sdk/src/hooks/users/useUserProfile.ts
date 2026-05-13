import { zHexString } from "@filosign/shared/zod";
import { useQuery } from "@tanstack/react-query";
import z from "zod";
import type ApiClient from "../../ApiClient";
import { DAY } from "../../constants";
import { useAuthedApi } from "../auth";

const userProfileResponseShape = {
	walletAddress: zHexString(),
	encryptionPublicKey: zHexString(),
	keygenData: z.any().nullable(),
	createdAt: z.string(),
	email: z.string().nullable(),
	username: z.string().nullable(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	avatarUrl: z.string().nullable(),
};

const zUserProfileModel = z.object(userProfileResponseShape);

export type UserProfile = z.infer<typeof zUserProfileModel>;

/** GET `/users/profile` with a JWT-backed client (e.g. after login/register). */
export async function fetchUserProfile(api: ApiClient): Promise<UserProfile> {
	const user = await api.rpc.getSafe(
		userProfileResponseShape,
		`/users/profile`,
	);
	return user.data;
}

export function useUserProfile() {
	const { data: api } = useAuthedApi();

	return useQuery({
		queryKey: ["user"],
		queryFn: async () => {
			if (!api) throw new Error("Noreachable");
			return fetchUserProfile(api);
		},
		staleTime: 1 * DAY,
		enabled: !!api,
	});
}
