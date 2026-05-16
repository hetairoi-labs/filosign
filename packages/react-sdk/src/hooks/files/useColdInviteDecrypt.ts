import { encryption, unwrapColdInviteDek } from "@filosign/crypto-utils";
import { decodeFileData } from "@filosign/shared";
import { useMutation } from "@tanstack/react-query";
import { type Hex, toBytes } from "viem";
import type { ViewFileResult } from "./useViewFile";

const FILE_ENCRYPTION_INFO = "ignore-encryption-info";

const dbg = (...xs: unknown[]) => {
	console.debug("[cold-invite decrypt]", ...xs);
};

export type ColdInviteDecryptArgs = {
	wrappedEncryptionKey: Hex;
	/** Six-word hyphenated phrase from the sender (out-of-band). */
	phrase: string;
	downloadUrl: string;
};

export type ColdInviteDecryptResult = ViewFileResult & {
	encryptionKey: Uint8Array;
};

/**
 * Decrypts an envelope blob for a cold (email-only) recipient using the
 * Argon2id-wrapped DEK from `GET /files/invite/by-token/:token`.
 */
export function useColdInviteDecrypt() {
	return useMutation<ColdInviteDecryptResult, Error, ColdInviteDecryptArgs>({
		mutationFn: async (args) => {
			dbg("mutation start", {
				phraseSegments: args.phrase.split("-").filter(Boolean).length,
				downloadUrlHost: (() => {
					try {
						return new URL(args.downloadUrl).host;
					} catch {
						return "invalid-url";
					}
				})(),
			});
			const encryptionKey = await unwrapColdInviteDek({
				wrappedEncryptionKey: toBytes(args.wrappedEncryptionKey),
				phrase: args.phrase,
			});
			dbg("unwrapColdInviteDek ok, fetching ciphertext");

			const dl = await fetch(args.downloadUrl);
			if (!dl.ok) {
				dbg("download failed", { status: dl.status });
				throw new Error("Could not download encrypted document");
			}
			const encryptedBlob = new Uint8Array(await dl.arrayBuffer());
			dbg("download ok bytes", encryptedBlob.byteLength);
			const decrypted = await encryption.decrypt({
				ciphertext: encryptedBlob,
				secretKey: encryptionKey,
				info: FILE_ENCRYPTION_INFO,
			});
			const parsed = await decodeFileData(decrypted);
			dbg("decodeFileData ok");

			return {
				fileBytes: parsed.bytes,
				sender: parsed.sender,
				timestamp: parsed.timestamp,
				metadata: parsed.metadata,
				placementManifest: parsed.placementManifest,
				encryptionKey,
			};
		},
	});
}
