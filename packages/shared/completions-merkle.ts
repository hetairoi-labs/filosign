import type { Address, Hex } from "viem";
import {
	concat,
	encodeAbiParameters,
	hexToBigInt,
	keccak256,
	stringToBytes,
} from "viem";

export const LEAF_SCHEMA_VERSION_V1 = 1 as const;

/** Map manifest field `id` string to a fixed-width field key for the leaf. */
export function fieldIdToBytes32(fieldId: string): Hex {
	return keccak256(stringToBytes(fieldId));
}

export function computeLeafHashV1(params: {
	fieldId: string;
	placementCommitment: Hex;
	pieceCid: string;
	signer: Address;
}): Hex {
	const pieceCidDigest = keccak256(stringToBytes(params.pieceCid));
	const fieldKey = fieldIdToBytes32(params.fieldId);
	const encoded = encodeAbiParameters(
		[
			{ type: "uint8", name: "leafSchemaVersion" },
			{ type: "bytes32", name: "fieldId" },
			{ type: "bytes32", name: "placementCommitment" },
			{ type: "bytes32", name: "pieceCidDigest" },
			{ type: "address", name: "signer" },
		],
		[
			LEAF_SCHEMA_VERSION_V1,
			fieldKey,
			params.placementCommitment,
			pieceCidDigest,
			params.signer,
		],
	);
	return keccak256(encoded);
}

function hashPair(a: Hex, b: Hex): Hex {
	const [left, right] = hexToBigInt(a) <= hexToBigInt(b) ? [a, b] : [b, a];
	return keccak256(concat([left as `0x${string}`, right as `0x${string}`]));
}

/**
 * Binary Merkle root over leaf hashes (already ordered).
 * Odd count: duplicate the last leaf at the current level (standard practice).
 */
export function merkleRootFromLeaves(leafHashes: Hex[]): Hex {
	if (leafHashes.length === 0) {
		throw new Error("merkleRootFromLeaves: empty leaves");
	}
	let level = [...leafHashes];
	while (level.length > 1) {
		const next: Hex[] = [];
		for (let i = 0; i < level.length; i += 2) {
			const left = level[i];
			const right = level[i + 1] ?? left;
			if (!left || !right) break;
			next.push(hashPair(left, right));
		}
		level = next;
	}
	const root = level[0];
	if (!root) throw new Error("merkleRootFromLeaves: no root");
	return root;
}

/** Sort field ids lexicographically, compute leaves, then Merkle root. */
export function completionsMerkleRootV1(params: {
	fieldIds: string[];
	placementCommitment: Hex;
	pieceCid: string;
	signer: Address;
}): Hex {
	const uniqueSorted = [...new Set(params.fieldIds)].sort((a, b) =>
		a.localeCompare(b),
	);
	const leaves = uniqueSorted.map((fieldId) =>
		computeLeafHashV1({
			fieldId,
			placementCommitment: params.placementCommitment,
			pieceCid: params.pieceCid,
			signer: params.signer,
		}),
	);
	return merkleRootFromLeaves(leaves);
}

/** Build tree levels: levels[0] = leaf hashes, levels[L] = root. */
export function merkleLevelsFromLeaves(leafHashes: Hex[]): Hex[][] {
	if (leafHashes.length === 0) {
		throw new Error("merkleLevelsFromLeaves: empty leaves");
	}
	const levels: Hex[][] = [];
	let level = [...leafHashes];
	levels.push(level);
	while (level.length > 1) {
		const next: Hex[] = [];
		for (let i = 0; i < level.length; i += 2) {
			const left = level[i];
			const right = level[i + 1] ?? left;
			if (!left || !right) break;
			next.push(hashPair(left, right));
		}
		level = next;
		levels.push(level);
	}
	return levels;
}

/**
 * Sibling hashes from leaf to root (same pairing rule as {@link merkleRootFromLeaves}).
 */
export function merkleInclusionSiblings(
	levels: Hex[][],
	leafIndex: number,
): Hex[] {
	const siblings: Hex[] = [];
	let index = leafIndex;
	for (let d = 0; d < levels.length - 1; d++) {
		const row = levels[d];
		if (!row) break;
		const pairBase = Math.floor(index / 2) * 2;
		const left = row[pairBase];
		const right = row[pairBase + 1] ?? left;
		const sibling = index === pairBase ? right : left;
		if (sibling !== undefined) siblings.push(sibling);
		index = Math.floor(index / 2);
	}
	return siblings;
}

/** Recompute root from one leaf and its sibling path (order-agnostic via hashPair). */
export function merkleRootFromLeafAndSiblings(
	leafHash: Hex,
	siblings: Hex[],
): Hex {
	let cur = leafHash;
	for (const sib of siblings) {
		cur = hashPair(cur, sib);
	}
	return cur;
}

export type CompletionMerkleLeafProofV1 = {
	fieldId: string;
	leafHash: Hex;
	leafIndex: number;
	siblings: Hex[];
};

/** One inclusion proof per completed field (sorted field order matches root). */
export function completionsMerkleProofsV1(params: {
	fieldIds: string[];
	placementCommitment: Hex;
	pieceCid: string;
	signer: Address;
}): CompletionMerkleLeafProofV1[] {
	const uniqueSorted = [...new Set(params.fieldIds)].sort((a, b) =>
		a.localeCompare(b),
	);
	const leaves = uniqueSorted.map((fieldId) =>
		computeLeafHashV1({
			fieldId,
			placementCommitment: params.placementCommitment,
			pieceCid: params.pieceCid,
			signer: params.signer,
		}),
	);
	const levels = merkleLevelsFromLeaves(leaves);
	return uniqueSorted.map((fieldId, leafIndex) => ({
		fieldId,
		leafHash: leaves[leafIndex] as Hex,
		leafIndex,
		siblings: merkleInclusionSiblings(levels, leafIndex),
	}));
}
