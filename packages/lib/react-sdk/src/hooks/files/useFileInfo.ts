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
	signers: string[];
	viewers: string[];
	signatures: Array<{
		signer: string;
		timestamp: string;
		onchainTxHash: `0x${string}`;
	}>;
	kemCiphertext: `0x${string}` | null;
	encryptedEncryptionKey: `0x${string}` | null;
};

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
					signers: z.array(z.string()),
					viewers: z.array(z.string()),
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
