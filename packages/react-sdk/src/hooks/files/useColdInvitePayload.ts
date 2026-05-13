import { zHexString } from "@filosign/shared/zod";
import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { useFilosignContext } from "../../context/useFilosignContext";

const zInvitePayload = z.object({
	pieceCid: z.string(),
	recipientEmails: z.array(z.string().email()).min(1),
	wrappedEncryptionKey: zHexString(),
	isSigner: z.boolean(),
	sender: z.string(),
	/** Display: name (email) or (email); falls back to checksummed wallet if no profile. */
	senderLabel: z.string(),
	placementManifest: z.unknown(),
	downloadUrl: z.string().min(1),
});

export type ColdInvitePayload = z.infer<typeof zInvitePayload>;

export function useColdInvitePayload(inviteToken: string | undefined) {
	const { api } = useFilosignContext();

	return useQuery({
		queryKey: ["fsQ-cold-invite", inviteToken],
		queryFn: async (): Promise<ColdInvitePayload> => {
			if (!api || !inviteToken) {
				throw new Error("Missing invite or API");
			}
			const response = await api.rpc.getSafe(
				{
					pieceCid: z.string(),
					recipientEmails: z.array(z.string().email()).min(1),
					wrappedEncryptionKey: zHexString(),
					isSigner: z.boolean(),
					sender: z.string(),
					senderLabel: z.string(),
					placementManifest: z.unknown(),
					downloadUrl: z.string(),
				},
				`/files/invite/by-token/${encodeURIComponent(inviteToken)}`,
			);
			return zInvitePayload.parse(response.data);
		},
		enabled: Boolean(api && inviteToken && inviteToken.length >= 8),
		staleTime: 60_000,
	});
}
