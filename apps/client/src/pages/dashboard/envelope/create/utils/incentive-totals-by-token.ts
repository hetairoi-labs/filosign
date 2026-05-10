import { type Address, getAddress } from "viem";
import { erc20DisplayForChain, SUPPORTED_TOKENS } from "@/src/constants";
import type { Recipient } from "../types";

/**
 * Sums incentive `amount` values (smallest units per token) grouped by ERC-20 contract address.
 */
export function incentiveTotalsByTokenWei(
	recipients: Recipient[],
): Map<Address, bigint> {
	const byLower = new Map<string, bigint>();

	for (const r of recipients) {
		const inc = r.incentive;
		if (!inc?.token?.trim() || !inc.amount?.trim()) continue;

		let token: Address;
		try {
			token = getAddress(inc.token as Address);
		} catch {
			continue;
		}

		let amt: bigint;
		try {
			amt = BigInt(inc.amount.trim());
		} catch {
			continue;
		}
		if (amt <= 0n) continue;

		const key = token.toLowerCase();
		byLower.set(key, (byLower.get(key) ?? 0n) + amt);
	}

	const out = new Map<Address, bigint>();
	for (const [lower, sum] of byLower) {
		out.set(getAddress(lower as Address), sum);
	}
	return out;
}

/** Label for toasts: known symbol from {@link SUPPORTED_TOKENS}, else short address. */
export function incentiveTokenLabel(tokenAddress: Address): string {
	const known = SUPPORTED_TOKENS.find(
		(t) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
	);
	if (known) return known.symbol;
	return erc20DisplayForChain(tokenAddress).label;
}
