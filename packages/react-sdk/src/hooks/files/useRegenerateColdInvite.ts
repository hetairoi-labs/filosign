import { zHexString } from "@filosign/shared/zod";
import { useMutation } from "@tanstack/react-query";
import z from "zod";
import { useAuthedApi } from "../auth/useAuthedApi";

export function useRegenerateColdInvite() {
	const { data: auth } = useAuthedApi();

	return useMutation({
		mutationFn: async (args: {
			pieceCid: string;
			inviteToken: string;
			wrappedEncryptionKey: `0x${string}`;
		}) => {
			if (!auth) throw new Error("Missing auth context");

			return auth.rpc.files.coldInvite.regenerate({
				pieceCid: args.pieceCid,
				body: {
					inviteToken: z.string().min(16).parse(args.inviteToken),
					wrappedEncryptionKey: zHexString().parse(args.wrappedEncryptionKey),
				},
			});
		},
	});
}
