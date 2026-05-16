import { useQuery } from "@tanstack/react-query";
import { useAuthedApi } from "../auth/useAuthedApi";
import { useAcceptedRecipients } from "./useSendableTo";

export function useAcceptedPeople() {
	const { data: auth } = useAuthedApi();
	const { data: acceptedRecipients } = useAcceptedRecipients();

	return useQuery({
		queryKey: ["accepted-people", acceptedRecipients],
		queryFn: async () => {
			if (!acceptedRecipients || !auth) return { people: [] };

			const people = await Promise.all(
				acceptedRecipients.map(async (request) => {
					try {
						const profile = await auth.rpc.users.profile.lookup({
							query: request.recipientWallet,
						});
						return {
							walletAddress: profile.walletAddress,
							displayName: profile.firstName
								? `${profile.firstName} ${profile.lastName || ""}`.trim()
								: null,
							username: null,
							avatarUrl: profile.avatarUrl,
							email: profile.email ?? null,
						};
					} catch (error) {
						console.error(
							`Failed to fetch profile for ${request.recipientWallet}:`,
							error,
						);
						return {
							walletAddress: request.recipientWallet,
							displayName: null,
							username: null,
							avatarUrl: null,
							email: null,
						};
					}
				}),
			);

			return { people };
		},
		enabled: !!acceptedRecipients && !!auth,
	});
}
