/**
 * World ID Router (on-chain) revert error selectors → user-facing messages.
 * Router contract is external; our ABI doesn’t include its errors, so we map selectors manually.
 *
 * Docs: https://docs.world.org/world-id/reference/errors
 * Contracts: https://docs.world.org/world-id/reference/contracts
 */

const WORLD_ID_ERROR_MESSAGES: Record<string, string> = {
	"0x7fcdd1f4": "Proof invalid.",
};

const FALLBACK_MESSAGE = "World ID linking failed";

function getSelector(error: unknown): string | undefined {
	if (error && typeof error === "object" && "signature" in error) {
		const sig = (error as { signature: string }).signature;
		if (typeof sig === "string" && /^0x[0-9a-fA-F]{8}$/.test(sig)) return sig;
	}
	const str = String(error);
	const match = str.match(/0x[0-9a-fA-F]{8}/);
	return match ? match[0] : undefined;
}

export function getWorldIdLinkErrorMessage(error: unknown): string {
	const selector = getSelector(error);
	if (selector && selector in WORLD_ID_ERROR_MESSAGES) {
		return WORLD_ID_ERROR_MESSAGES[selector];
	}
	return FALLBACK_MESSAGE;
}
