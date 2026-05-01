import { zHexString } from "@filosign/shared/zod";
import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { useAuthedApi } from "../auth/useAuthedApi";

export type FileInfo = {
	pieceCid: string;
	sender: string;
	status: string;
	onchainTxHash: `0x${string}`;
	createdAt: string;
	signers: Array<
		string | { wallet: string; name: string | null; email: string | null }
	>;
	viewers: Array<
		string | { wallet: string; name: string | null; email: string | null }
	>;
	signatures: Array<{
		signer: string;
		timestamp: string;
		onchainTxHash: `0x${string}`;
	}>;
	kemCiphertext: `0x${string}` | null;
	encryptedEncryptionKey: `0x${string}` | null;
};

const zParticipant = z.union([
	z.string(),
	z.object({
		wallet: z.string(),
		name: z.string().nullable(),
		email: z.string().nullable(),
	}),
]);

export function useFileInfo(args: { pieceCid: string | undefined }) {
	const { data: api } = useAuthedApi();

	return useQuery<FileInfo>({
		queryKey: ["fsQ-file-info", args.pieceCid],
		queryFn: async (): Promise<FileInfo> => {
			if (!api) throw new Error("API not ready");
			const response = await api.rpc.getSafe(
				{
					pieceCid: z.string(),
					sender: z.string(),
					status: z.string(),
					onchainTxHash: zHexString(),
					createdAt: z.string(),
					signers: z.array(zParticipant),
					viewers: z.array(zParticipant),
					signatures: z.array(
						z.object({
							signer: z.string(),
							timestamp: z.string(),
							onchainTxHash: zHexString(),
						}),
					),
					kemCiphertext: zHexString().nullable(),
					encryptedEncryptionKey: zHexString().nullable(),
				},
				`/files/${args.pieceCid}`,
			);

			return response.data as FileInfo;
		},
		enabled: !!args.pieceCid && !!api,
	});
}
