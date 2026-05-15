import { type Address, getAddress, parseUnits } from "viem";
import { erc20DisplayForChain, SUPPORTED_TOKENS } from "@/src/constants";
import type { Recipient } from "../types";

/**
 * Sums per-recipient invoice `amount` values (human decimal strings) into wei,
 * grouped by ERC-20 contract address.
 */
export function invoiceTotalsByTokenWei(
	recipients: Recipient[],
): Map<Address, bigint> {
	const byLower = new Map<string, bigint>();

	for (const r of recipients) {
		const inv = r.invoice;
		if (!inv?.token?.trim() || !inv.amount?.trim()) continue;

		let token: Address;
		try {
			token = getAddress(inv.token as Address);
		} catch {
			continue;
		}

		const meta = SUPPORTED_TOKENS.find(
			(t) => t.address.toLowerCase() === token.toLowerCase(),
		);
		const decimals = meta?.decimals ?? 18;

		let amt: bigint;
		try {
			amt = parseUnits(inv.amount.trim(), decimals);
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
export function invoiceTokenLabel(tokenAddress: Address): string {
	const known = SUPPORTED_TOKENS.find(
		(t) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
	);
	if (known) return known.symbol;
	return erc20DisplayForChain(tokenAddress).label;
}
