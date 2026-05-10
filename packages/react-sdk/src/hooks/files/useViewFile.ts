import { encryption, KEM, toBytes } from "@filosign/crypto-utils";
import { decodeFileData, type PlacementManifest } from "@filosign/shared";
import { useMutation } from "@tanstack/react-query";
import z from "zod";
import { useFilosignContext } from "../../context/useFilosignContext";
import { getSessionSeed } from "../auth/session-seed";

export type ViewFileArgs = {
	pieceCid: string;
	kemCiphertext: string;
	encryptedEncryptionKey: string;
	status: "s3" | "foc";
};

export type ViewFileMetadata = {
	name: string;
	mimeType?: string;
};

export type ViewFileResult = {
	fileBytes: Uint8Array;
	sender: `0x${string}`;
	timestamp: number;
	metadata: ViewFileMetadata;
	placementManifest: PlacementManifest;
};

const DEBUG_PREFIX = "[useViewFile]";
const debugLog = (step: string, data?: unknown) => {
	console.log(
		`${DEBUG_PREFIX} ${step}`,
		data ? JSON.stringify(data, null, 2) : "",
	);
};

export function useViewFile() {
	const { contracts, wallet, api, runtime } = useFilosignContext();

	return useMutation<ViewFileResult, Error, ViewFileArgs>({
		mutationFn: async (args) => {
			const { pieceCid, kemCiphertext, encryptedEncryptionKey } = args;

			debugLog("MUTATION_START", {
				pieceCid,
				walletAddress: wallet?.account?.address,
			});

			if (!contracts || !wallet || !runtime || !api) {
				debugLog("VALIDATION_FAILED", {
					hasContracts: !!contracts,
					hasWallet: !!wallet,
					hasRuntime: !!runtime,
					hasApi: !!api,
				});
				throw new Error("not conected iido");
			}

			let data: Uint8Array;

			// S3 is the source of truth for now.
			// We still upload to Filecoin Onchain Cloud, but downloads should prefer S3
			// (and fall back to Filecoin when needed).
			try {
				debugLog("FETCHING_S3_PRESIGNED_URL", { pieceCid });
				const s3Response = await api.rpc.getSafe(
					{
						presignedUrl: z.string(),
					},
					`/files/${pieceCid}/s3`,
				);

				if (!s3Response.success) {
					debugLog("S3_URL_FETCH_FAILED", { pieceCid });
					throw new Error("Failed to fetch file from S3");
				}

				const { presignedUrl } = s3Response.data;
				debugLog("S3_PRESIGNED_URL_RECEIVED", {
					urlLength: presignedUrl.length,
				});

				debugLog("DOWNLOADING_FROM_S3");
				const downloadResponse = await fetch(presignedUrl, {
					method: "GET",
				});

				if (!downloadResponse.ok) {
					debugLog("S3_DOWNLOAD_FAILED", {
						status: downloadResponse.status,
						statusText: downloadResponse.statusText,
					});
					throw new Error("Failed to fetch file from S3");
				}

				data = new Uint8Array(await downloadResponse.arrayBuffer());
				debugLog("S3_DOWNLOAD_SUCCESS", { byteLength: data.length });
			} catch (s3Err) {
				debugLog("S3_FALLBACK_TO_FILECOIN", {
					error: s3Err instanceof Error ? s3Err.message : String(s3Err),
				});
				const filecoinUrl = `https://${runtime.serverAddressSynapse}.calibration.filbeam.io/${pieceCid}`;
				debugLog("FETCHING_FROM_FILECOIN", { url: filecoinUrl });

				const fileResponse = await fetch(filecoinUrl);

				if (!fileResponse.ok) {
					const errorText = await fileResponse.text();
					debugLog("FILECOIN_FETCH_FAILED", {
						status: fileResponse.status,
						errorText,
					});
					console.error("Filecoin error response:", errorText);
					throw new Error(
						`Failed to fetch file from S3 and Filecoin: ${fileResponse.status} - ${errorText}`,
					);
				}

				const arrayBuffer = await fileResponse.arrayBuffer();
				data = new Uint8Array(arrayBuffer);
				debugLog("FILECOIN_DOWNLOAD_SUCCESS", { byteLength: data.length });
				console.warn(
					"[useViewFile] S3 download failed, fell back to Filecoin",
					{
						pieceCid,
						error: s3Err instanceof Error ? s3Err.message : String(s3Err),
					},
				);
			}

			debugLog("GETTING_SESSION_SEED", {
				walletAddress: wallet.account.address,
			});
			const keySeed = getSessionSeed(wallet.account.address);
			if (!keySeed) {
				debugLog("SESSION_SEED_NOT_FOUND");
				throw new Error("No unlocked key seed found");
			}
			debugLog("SESSION_SEED_FOUND", { seedLength: keySeed.length });

			debugLog("GENERATING_KEM_KEYPAIR");
			const { privateKey } = await KEM.keyGen({
				seed: new Uint8Array(Array.from(keySeed)),
			});
			debugLog("KEM_KEYPAIR_GENERATED", {
				privateKeyLength: privateKey.length,
			});

			debugLog("DECAPSULATING_KEM");
			const { sharedSecret: ssE } = await KEM.decapsulate({
				ciphertext: toBytes(kemCiphertext),
				privateKeySelf: privateKey,
			});
			debugLog("KEM_DECAPSULATED", { sharedSecretLength: ssE.length });
			let encryptionKey: Uint8Array;
			try {
				debugLog("DECRYPTING_ENCRYPTION_KEY");
				encryptionKey = await encryption.decrypt({
					ciphertext: toBytes(encryptedEncryptionKey),
					secretKey: ssE,
					info: `${pieceCid}:${wallet.account.address}`,
				});
				debugLog("ENCRYPTION_KEY_DECRYPTED", {
					keyLength: encryptionKey.length,
				});
			} catch (e) {
				debugLog("ENCRYPTION_KEY_DECRYPTION_FAILED", {
					error: e instanceof Error ? e.message : String(e),
				});
				console.error("Decryption error: ", e);
				throw e;
			}

			const encryptionInfo = "ignore-encryption-info";

			debugLog("DECRYPTING_FILE_DATA", { dataLength: data.length });
			const decryptedData = await encryption.decrypt({
				ciphertext: data,
				secretKey: encryptionKey,
				info: encryptionInfo,
			});
			debugLog("FILE_DATA_DECRYPTED", {
				decryptedLength: decryptedData.length,
			});

			debugLog("DECODING_FILE_DATA");
			const parsedData = await decodeFileData(decryptedData);
			debugLog("FILE_DATA_DECODED", {
				sender: parsedData.sender,
				timestamp: parsedData.timestamp,
				metadata: parsedData.metadata,
				hasPlacementManifest: !!parsedData.placementManifest,
			});

			return {
				fileBytes: parsedData.bytes,
				sender: parsedData.sender,
				timestamp: parsedData.timestamp,
				metadata: parsedData.metadata,
				placementManifest: parsedData.placementManifest,
			};
		},
	});
}
