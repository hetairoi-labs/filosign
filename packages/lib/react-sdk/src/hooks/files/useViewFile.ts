import { encryption, KEM, toBytes } from "@filosign/crypto-utils";
import { decodeFileData } from "@filosign/shared";
import { useMutation } from "@tanstack/react-query";
import z from "zod";
import { idb } from "../../../utils/idb";
import { useFilosignContext } from "../../context/FilosignProvider";

type ViewFileArgs = {
	pieceCid: string;
	kemCiphertext: string;
	encryptedEncryptionKey: string;
	status: "s3" | "foc";
};

type ViewFileMetadata = {
	name: string;
	mimeType?: string;
};

type ViewFileResult = {
	fileBytes: Uint8Array;
	sender: `0x${string}`;
	timestamp: number;
	metadata: ViewFileMetadata;
};

export function useViewFile() {
	const { contracts, wallet, api, runtime } = useFilosignContext();

	return useMutation<ViewFileResult, Error, ViewFileArgs>({
		mutationFn: async (args) => {
			const { pieceCid, kemCiphertext, encryptedEncryptionKey, status } = args;
			console.log("asdasd", args);

			if (!contracts || !wallet || !runtime) {
				throw new Error("not conected iido");
			}

			let data: Uint8Array;

			if (status === "s3") {
				const s3Response = await api.rpc.getSafe(
					{
						presignedUrl: z.string(),
					},
					`/files/${pieceCid}/s3`,
				);

				if (!s3Response.success) {
					throw new Error("Failed to fetch file from S3");
				}

				const { presignedUrl } = s3Response.data;

				const downloadResponse = await fetch(presignedUrl, {
					method: "GET",
				});

				if (!downloadResponse.ok) {
					throw new Error("Failed to fetch file from S3");
				}

				data = new Uint8Array(await downloadResponse.arrayBuffer());
			} else {
				const filecoinUrl = `https://${runtime.serverAddressSynapse}.calibration.filbeam.io/${pieceCid}`;

				const fileResponse = await fetch(filecoinUrl);

				if (!fileResponse.ok) {
					const errorText = await fileResponse.text();
					console.error("Filecoin error response:", errorText);
					throw new Error(
						`Failed to fetch file from Filecoin: ${fileResponse.status} - ${errorText}`,
					);
				}

				const arrayBuffer = await fileResponse.arrayBuffer();

				data = new Uint8Array(arrayBuffer);
			}

			const keyStore = idb({
				db: wallet.account.address,
				store: "fs-keystore",
			});
			const keySeed = await keyStore.secret.get("key-seed");

			if (!keySeed) throw new Error("No key seed found in keystore");

			const { privateKey } = await KEM.keyGen({ seed: keySeed });

			const { sharedSecret: ssE } = await KEM.decapsulate({
				ciphertext: toBytes(kemCiphertext),
				privateKeySelf: privateKey,
			});
			let encryptionKey: Uint8Array;
			try {
				encryptionKey = await encryption.decrypt({
					ciphertext: toBytes(encryptedEncryptionKey),
					secretKey: ssE,
					info: `${pieceCid}:${wallet.account.address}`,
				});
			} catch (e) {
				console.error("Decryption error: ", e);
				throw e;
			}

			const encryptionInfo = "ignore-encryption-info";

			const decryptedData = await encryption.decrypt({
				ciphertext: data,
				secretKey: encryptionKey,
				info: encryptionInfo,
			});

			const parsedData = await decodeFileData(decryptedData);

			return {
				fileBytes: parsedData.bytes,
				sender: parsedData.sender,
				timestamp: parsedData.timestamp,
				metadata: parsedData.metadata,
			};
		},
	});
}
