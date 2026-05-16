import { zHexString } from "@filosign/shared/zod";
import { useMutation } from "@tanstack/react-query";
import z from "zod";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useRegenerateColdInvite() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async (args: {
			pieceCid: string;
			inviteToken: string;
			wrappedEncryptionKey: `0x${string}`;
		}) => {
			if (!isAuthed) throw new Error("Not authenticated");

			return rpcQuery.files.coldInvite.regenerate.call({
				pieceCid: args.pieceCid,
				body: {
					inviteToken: z.string().min(16).parse(args.inviteToken),
					wrappedEncryptionKey: zHexString().parse(args.wrappedEncryptionKey),
				},
			});
		},
	});
}
