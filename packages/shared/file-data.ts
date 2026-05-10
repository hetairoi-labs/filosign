import z from "zod";
import { zEvmAddress } from "./helpers/zod";
import { zPlacementManifest } from "./placement-manifest";

/** Encrypted PDF bundle JSON shape (decrypted plaintext before parsing). */
export const zFileData = () =>
	z.object({
		bytesB64: z.string(),
		sender: zEvmAddress(),
		timestamp: z.number(),
		metadata: z.object({
			name: z.string(),
		}),
		placementManifest: zPlacementManifest,
	});
