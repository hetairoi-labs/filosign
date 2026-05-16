import { type ByteArray, encodePacked, type Hex, isHex, keccak256 } from "viem";

/**
 * @deprecated Use `digest` instead.
 */
export function hash(value: Hex | ByteArray | string) {
	return digest(value);
}

/** Keccak-256 over packed string or raw bytes — pre-hash for Dilithium sign/verify. */
export function digest(value: Hex | ByteArray | string) {
	if (typeof value === "string" && !isHex(value)) {
		return keccak256(encodePacked(["string"], [value]));
	}
	return keccak256(value);
}
