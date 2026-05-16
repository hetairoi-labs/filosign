import { zHexString } from "@filosign/shared/zod";
import { useMutation } from "@tanstack/react-query";
import { useAuthedApi } from "../auth/useAuthedApi";

export function useClaimColdInvite() {
	const { data: auth } = useAuthedApi();

	return useMutation({
		mutationFn: async (args: {
			inviteToken: string;
			kemCiphertext: `0x${string}`;
			encryptedEncryptionKey: `0x${string}`;
		}) => {
			if (!auth) throw new Error("Not authenticated");

			return auth.rpc.files.coldInvite.claim({
				inviteToken: args.inviteToken,
				body: {
					kemCiphertext: zHexString().parse(args.kemCiphertext),
					encryptedEncryptionKey: zHexString().parse(
						args.encryptedEncryptionKey,
					),
				},
			});
		},
	});
}
