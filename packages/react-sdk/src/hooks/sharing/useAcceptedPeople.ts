import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { useFilosignContext } from "../../context/FilosignProvider";
import { useAcceptedRecipients } from "./useSendableTo";

export function useAcceptedPeople() {
	const { api } = useFilosignContext();
	const { data: acceptedRecipients } = useAcceptedRecipients();

	return useQuery({
		queryKey: ["accepted-people", acceptedRecipients],
		queryFn: async () => {
			if (!acceptedRecipients || !api) return { people: [] };

			// Fetch profiles for each accepted recipient
			const people = await Promise.all(
				acceptedRecipients.map(async (request) => {
					try {
						const response = await api.rpc.getSafe(
							{
								walletAddress: z.string(),
								encryptionPublicKey: z.string(),
								lastActiveAt: z.string().nullable(),
								createdAt: z.string(),
								firstName: z.string().nullable(),
								lastName: z.string().nullable(),
								avatarUrl: z.string().nullable(),
							},
							`/users/profile/${request.recipientWallet}`,
						);

						const profile = response.data;
						return {
							walletAddress: profile.walletAddress,
							displayName: profile.firstName
								? `${profile.firstName} ${profile.lastName || ""}`.trim()
								: null,
							username: null, // This endpoint doesn't return username
							avatarUrl: profile.avatarUrl,
						};
					} catch (error) {
						console.error(
							`Failed to fetch profile for ${request.recipientWallet}:`,
							error,
						);
						// Return basic info if profile fetch fails
						return {
							walletAddress: request.recipientWallet,
							displayName: null,
							username: null,
							avatarUrl: null,
						};
					}
				}),
			);

			return { people };
		},
		enabled: !!acceptedRecipients && !!api,
	});
}
