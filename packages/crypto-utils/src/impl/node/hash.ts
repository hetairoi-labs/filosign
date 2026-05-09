import { type ByteArray, encodePacked, type Hex, isHex, keccak256 } from "viem";
import {
	ARGON_MEMORY_COST_KIB,
	ARGON_PARALLELISM_DEGREE,
	ARGON_TIMES_COST,
} from "../../constants";

/**
 * @deprecated
 */
export function hash(value: Hex | ByteArray | string) {
	if (typeof value === "string" && !isHex(value)) {
		return keccak256(encodePacked(["string"], [value]));
	}
	return keccak256(value);
}

export function digest(value: Hex | ByteArray | string) {
	if (typeof value === "string" && !isHex(value)) {
		return keccak256(encodePacked(["string"], [value]));
	}
	return keccak256(value);
}

export function argon(...args: Parameters<typeof keccak256>) {
	const [value, ...rest] = args;
	return keccak256(
		encodePacked(
			["string", "string", "string", "string"],
			[
				value.toString(),
				ARGON_MEMORY_COST_KIB.toString(),
				ARGON_TIMES_COST.toString(),
				ARGON_PARALLELISM_DEGREE.toString(),
			],
		),
		...rest,
	);
}
