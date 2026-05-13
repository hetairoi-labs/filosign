import type { Hex } from "viem";
import { keccak256, stringToBytes } from "viem";

const PRIVY_SUBJECT_PREFIX = "filosign:privy-subject:v1:" as const;

/**
 * Domain-separated commitment for a Privy subject id (`users.privyDid`).
 * Must match `FSFileRegistry` EIP-712 `privySubjectCommitment` (never put raw DID on-chain).
 */
export function hashPrivySubjectCommitment(privyDid: string): Hex {
	const d = privyDid.trim();
	if (!d) {
		throw new Error("privyDid is required");
	}
	return keccak256(stringToBytes(`${PRIVY_SUBJECT_PREFIX}${d}`)) as Hex;
}

/**
 * Stored in `file_acknowledgements.ack` after a cold-invite claim so the row exists before
 * a warm EIP-712 ack. Replaced by the real secp256k1 signature on `POST /files/:pieceCid/ack`.
 */
export const FILE_ACK_COLD_CLAIM_SENTINEL_V1 = keccak256(
	stringToBytes("filosign:file_ack:cold_claim_only:v1"),
) as Hex;
