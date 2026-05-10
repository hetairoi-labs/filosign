import z from "zod";
import { zEvmAddress, zHexString } from "./helpers/zod";
import { zPlacementManifest } from "./placement-manifest";

/** Single leaf inclusion proof (matches {@link completionsMerkleProofsV1}). */
export const zMerkleLeafProofV1 = z.object({
	fieldId: z.string(),
	leafHash: zHexString(),
	leafIndex: z.number().int().min(0),
	siblings: z.array(zHexString()),
});

export const zSignerComplianceRowV1 = z.object({
	wallet: zEvmAddress(),
	displayName: z.string().nullable(),
	email: z.string().nullable(),
	signed: z.boolean(),
	assignedFieldIds: z.array(z.string()),
	requiredFieldIds: z.array(z.string()),
	optionalFieldIds: z.array(z.string()),
	onchainTxHash: zHexString().nullable(),
	signedAtIso: z.string().nullable(),
	completedFieldIds: z.array(z.string()),
	completionsRoot: zHexString().nullable(),
	leafSchemaVersion: z.number().int().nullable(),
	merkleProofs: z.array(zMerkleLeafProofV1),
	/** In-progress selections when `signed` is false (from sign draft). */
	draftCompletedFieldIds: z.array(z.string()),
});

export const zComplianceBundleV1 = z.object({
	version: z.literal(1),
	pieceCid: z.string(),
	chainId: z.number().int(),
	exportedAtIso: z.string(),
	executionStatus: z.enum(["fully_executed", "partially_executed"]),
	placementCommitment: zHexString(),
	placementManifest: zPlacementManifest,
	registration: z.object({
		sender: zEvmAddress(),
		registrationTxHash: zHexString(),
		createdAtIso: z.string(),
	}),
	signers: z.array(zSignerComplianceRowV1),
});

export type ComplianceBundleV1 = z.infer<typeof zComplianceBundleV1>;
export type SignerComplianceRowV1 = z.infer<typeof zSignerComplianceRowV1>;
export type MerkleLeafProofV1 = z.infer<typeof zMerkleLeafProofV1>;

function sortKeysDeep(value: unknown): unknown {
	if (value === null || typeof value !== "object") {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map(sortKeysDeep);
	}
	const obj = value as Record<string, unknown>;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(obj).sort()) {
		sorted[key] = sortKeysDeep(obj[key]);
	}
	return sorted;
}

/** Stable JSON for hashing / audit storage. */
export function canonicalComplianceBundleJson(
	bundle: ComplianceBundleV1,
): string {
	const sorted = sortKeysDeep(bundle) as ComplianceBundleV1;
	return JSON.stringify(sorted);
}
