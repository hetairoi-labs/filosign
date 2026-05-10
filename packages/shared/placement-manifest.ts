import { jsonStringify } from "@filosign/crypto-utils/node";
import type { Address, Hex } from "viem";
import { keccak256, stringToBytes } from "viem";
import z from "zod";
import { zEvmAddress } from "./helpers/zod";

/** Normalized coordinates on the page (0–1). */
export const zRectNormalized = z.object({
	x: z.number().min(0).max(1),
	y: z.number().min(0).max(1),
	width: z.number().min(0).max(1),
	height: z.number().min(0).max(1),
});

export const zPlacementField = z.object({
	id: z.string().min(1),
	pageIndex: z.number().int().min(0),
	rect: zRectNormalized,
	assignedSigner: zEvmAddress(),
	required: z.boolean(),
	type: z.enum([
		"signature",
		"initial",
		"date",
		"name",
		"email",
		"text",
		"checkbox",
	]),
});

export const zPlacementManifest = z.object({
	version: z.literal(1),
	fields: z.array(zPlacementField).min(1),
});

export type PlacementManifest = z.infer<typeof zPlacementManifest>;
export type PlacementField = z.infer<typeof zPlacementField>;

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

/** Canonical JSON string for hashing — stable key order. */
export function canonicalPlacementManifestJson(
	manifest: PlacementManifest,
): string {
	const parsed = zPlacementManifest.parse(manifest);
	return jsonStringify(sortKeysDeep(parsed) as PlacementManifest);
}

export function computePlacementCommitment(manifest: PlacementManifest): Hex {
	return keccak256(stringToBytes(canonicalPlacementManifestJson(manifest)));
}

export function fieldIdsForSigner(
	manifest: PlacementManifest,
	signer: Address,
): PlacementField[] {
	return manifest.fields.filter(
		(f) => f.assignedSigner.toLowerCase() === signer.toLowerCase(),
	);
}

/** Distinct field ids assigned to `signer` that are marked required. */
export function requiredFieldIdsForSigner(
	manifest: PlacementManifest,
	signer: Address,
): string[] {
	return fieldIdsForSigner(manifest, signer)
		.filter((f) => f.required)
		.map((f) => f.id);
}
