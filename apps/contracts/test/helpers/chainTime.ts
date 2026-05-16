import type { PublicClient } from "viem";

/** Use chain time for EIP-712 payloads — `block.timestamp` must align with `SIGNATURE_VALIDITY_PERIOD`. */
export async function latestBlockTimestamp(
	publicClient: PublicClient,
): Promise<bigint> {
	const block = await publicClient.getBlock({ blockTag: "latest" });
	if (block?.timestamp == null) {
		throw new Error("latest block timestamp unavailable");
	}
	return block.timestamp;
}
