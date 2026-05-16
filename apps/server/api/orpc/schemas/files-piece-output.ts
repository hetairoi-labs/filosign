/**
 * Output schemas for {@link ../../../api/handlers/files-piece} procedures exposed under `files.piece` in ORPC.
 * Client `RouterClient` infers outputs from `.output(schema)` (`InferSchemaOutput`); avoid `z.unknown()` outputs
 * if you want end-to-end typings.
 *
 * @see https://orpc.dev/docs (Packages — end-to-end type safety with Standard Schema / Zod)
 */
import { zComplianceBundle } from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import { z } from "zod";

const rosterPersonSchema = z.object({
	wallet: z.string(),
	name: z.string().nullable(),
	email: z.string().nullable(),
});

/** Wire shape mirrors `pieceDetail` (JSON transport may hydrate some fields as native types — see ORPC serializers). */
export const rpcPieceDetailOutputSchema = z.object({
	pieceCid: z.string(),
	sender: z.string(),
	status: z.string(),
	onchainTxHash: zHexString(),
	createdAt: z.union([z.string(), z.date()]),
	placementCommitment: zHexString(),
	placementManifest: z.unknown(),
	signers: z.array(rosterPersonSchema),
	viewers: z.array(rosterPersonSchema),
	signatures: z.array(
		z.object({
			signer: z.string(),
			timestamp: z.union([z.string(), z.date()]),
			onchainTxHash: zHexString(),
		}),
	),
	kemCiphertext: zHexString().nullable(),
	encryptedEncryptionKey: zHexString().nullable(),
});

export type RpcPieceDetailOutput = z.output<typeof rpcPieceDetailOutputSchema>;

/** {@link ../../../api/handlers/files-piece.pieceAck} */
export const rpcPieceAckOutputSchema = z.object({});

/** {@link ../../../api/handlers/files-piece.pieceSignDraftGet}, {@link ../../../api/handlers/files-piece.pieceSignDraftPut} */
export const rpcPieceSignDraftFieldIdsOutputSchema = z.object({
	completedFieldIds: z.array(z.string()),
});

/** {@link ../../../api/handlers/files-piece.pieceS3Url} */
export const rpcPieceS3UrlOutputSchema = z.object({
	presignedUrl: z.string(),
});

/** {@link ../../../api/handlers/files-piece.pieceComplianceBundle} */
export const rpcPieceComplianceBundleOutputSchema = z.object({
	exportId: z.string().uuid(),
	bundleHash: zHexString(),
	bundle: zComplianceBundle,
});

/** {@link ../../../api/handlers/files-piece.pieceIncentive} */
export const rpcPieceIncentiveOutputSchema = z.object({
	txHash: zHexString(),
	platformFeeBps: z.number(),
	grossAmount: z.string(),
	signerNetAmount: z.string(),
});

/** {@link ../../../api/handlers/files-piece.pieceSign} */
export const rpcPieceSignOutputSchema = z.object({
	txHash: zHexString(),
	signature: zHexString(),
	approveSenderTxHash: zHexString().nullable(),
});
