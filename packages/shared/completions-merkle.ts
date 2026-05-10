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
