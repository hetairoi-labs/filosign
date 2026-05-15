import type { Address, Hex } from "viem";
import { getAddress, keccak256, stringToBytes } from "viem";

/** Canonical Circle USDC on Base (mainnet). */
export const USDC_BASE_MAINNET: Address =
	"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

/** Canonical Circle USDC on Base Sepolia (testnet). */
export const USDC_BASE_SEPOLIA: Address =
	"0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const BY_CHAIN: Readonly<Record<number, Address>> = {
	8453: USDC_BASE_MAINNET,
	84532: USDC_BASE_SEPOLIA,
};

export function canonicalInvoiceUsdc(chainId: number): Address | undefined {
	return BY_CHAIN[chainId];
}

export function isCanonicalInvoiceUsdc(
	chainId: number,
	token: Address,
): boolean {
	if (chainId === 31337) {
		const t = getAddress(token);
		return (
			t === getAddress(USDC_BASE_MAINNET) || t === getAddress(USDC_BASE_SEPOLIA)
		);
	}
	const expected = canonicalInvoiceUsdc(chainId);
	if (!expected) return false;
	return getAddress(token) === getAddress(expected);
}

const MAX_INVOICE_MEMO_LEN = 2000;

export function validateInvoiceMemo(memo: string): {
	ok: true;
	normalized: string;
} {
	const normalized = memo.trim();
	if (normalized.length === 0) {
		throw new Error("Invoice memo is required");
	}
	if (normalized.length > MAX_INVOICE_MEMO_LEN) {
		throw new Error(
			`Invoice memo must be at most ${MAX_INVOICE_MEMO_LEN} characters`,
		);
	}
	return { ok: true, normalized };
}

/** Stub AML / policy gate — extend with rulesets later. */
export function assessInvoiceForAml(memo: string): "cleared" | "blocked" {
	const lower = memo.toLowerCase();
	if (
		/\b(mixer|tumbler|wash|money laundering|terror)\b/i.test(lower) ||
		/\b(bc1|0x)[a-z0-9]{20,}/i.test(lower)
	) {
		return "blocked";
	}
	return "cleared";
}

export function hashInvoiceMemo(args: {
	memo: string;
	pieceCid: string;
	signerEmailCommitment: Hex;
	amount: string;
	token: Address;
}): Hex {
	const payload = `filosign:invoice:v1|${args.memo}|${args.pieceCid}|${args.signerEmailCommitment}|${args.amount}|${getAddress(args.token)}`;
	return keccak256(stringToBytes(payload));
}
