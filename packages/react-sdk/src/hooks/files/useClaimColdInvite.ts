import { zHexString } from "@filosign/shared/zod";
import { useMutation } from "@tanstack/react-query";
import z from "zod";
import { useFilosignContext } from "../../context/useFilosignContext";

export function useClaimColdInvite() {
	const { api } = useFilosignContext();

	return useMutation({
		mutationFn: async (args: {
			inviteToken: string;
			kemCiphertext: `0x${string}`;
			encryptedEncryptionKey: `0x${string}`;
		}) => {
			if (!api) throw new Error("Missing API context");
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
			return res.data;
		},
	});
}
