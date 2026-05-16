import { zHexString } from "@filosign/shared/zod";
import { useMutation } from "@tanstack/react-query";
import z from "zod";
import { useFilosignContext } from "../../context/useFilosignContext";

const dbg = (...xs: unknown[]) => {
	console.debug("[cold-invite claim]", ...xs);
};

export function useClaimColdInvite() {
	const { api } = useFilosignContext();

	return useMutation({
		mutationFn: async (args: {
			inviteToken: string;
			kemCiphertext: `0x${string}`;
			encryptedEncryptionKey: `0x${string}`;
		}) => {
			if (!api) throw new Error("Missing API context");
			dbg("mutation start", { inviteTokenLen: args.inviteToken.length });
			const res = await api.rpc.postSafe(
				{
					filePieceCid: z.string(),
					role: z.enum(["signer", "viewer"]),
				},
				`/files/invite/claim/${encodeURIComponent(args.inviteToken)}`,
				{
					kemCiphertext: zHexString().parse(args.kemCiphertext),
					encryptedEncryptionKey: zHexString().parse(
						args.encryptedEncryptionKey,
					),
				},
			);
			dbg("mutation success");
			return res.data;
		},
	});
}
