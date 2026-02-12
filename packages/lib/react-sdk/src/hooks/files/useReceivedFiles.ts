import { zHexString } from "@filosign/shared/zod";
import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { useAuthedApi } from "../auth/useAuthedApi";

export function useReceivedFiles() {
	const { data: api } = useAuthedApi();

	return useQuery({
		queryKey: ["received-files"],
		queryFn: async () => {
			const response = await api.rpc.getSafe(
				{
					files: z.array(
						z.object({
							pieceCid: z.string(),
							sender: z.string(),
							status: z.string(),
							encryptedEncryptionKey: zHexString(),
							kemCiphertext: zHexString(),
						}),
					),
				},
				"/files/received",
			);

			return response.data.files;
		},
		enabled: !!api,
	});
}
