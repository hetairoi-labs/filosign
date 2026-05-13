import { zHexString } from "@filosign/shared/zod";
import { useMutation } from "@tanstack/react-query";
import z from "zod";
import { useFilosignContext } from "../../context/useFilosignContext";

export function useRegenerateColdInvite() {
	const { api } = useFilosignContext();

	return useMutation({
		mutationFn: async (args: {
			pieceCid: string;
			inviteToken: string;
			wrappedEncryptionKey: `0x${string}`;
		}) => {
			if (!api) throw new Error("Missing API context");
			const res = await api.rpc.postSafe(
				{
					inviteToken: z.string(),
					recipientEmails: z.array(z.string().email()).min(1),
					expiresAt: z.string(),
				},
				`/files/${encodeURIComponent(args.pieceCid)}/cold-invite/regenerate`,
				{
					inviteToken: z.string().min(16).parse(args.inviteToken),
					wrappedEncryptionKey: zHexString().parse(args.wrappedEncryptionKey),
				},
			);
			return res.data;
		},
	});
}
