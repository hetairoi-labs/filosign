import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useAuthedApi } from "../auth/useAuthedApi";

export function useSentEmailInvites() {
	const { data: api } = useAuthedApi();

	return useQuery({
		queryKey: ["sent-email-invites"],
		queryFn: async () => {
			if (!api) throw new Error("API is unreachable");
			const response = await api.rpc.getSafe(
				{
					invites: z.array(
						z.object({
							id: z.string(),
							inviteeEmail: z.string(),
							message: z.string().nullable(),
							accepted: z.boolean(),
							createdAt: z.string(),
						}),
					),
				},
				"/sharing/email-invites",
			);
			return response.data.invites;
		},
		enabled: !!api,
	});
}
