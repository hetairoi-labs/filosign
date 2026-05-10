import type { User } from "@privy-io/node";
import { PrivyClient } from "@privy-io/node";
import type { Address } from "viem";
import env from "@/env";

export interface PrivyAuthResult {
	privyDid: string;
	email: string | null;
	walletAddress: string | null;
}

export const privyClient = new PrivyClient({
	appId: env.PRIVY_APP_ID,
	appSecret: env.PRIVY_APP_SECRET,
	jwtVerificationKey: env.PRIVY_VERIFICATION_KEY,
});

function linkedWalletAddresses(user: User): string[] {
	const out: string[] = [];
	for (const account of user.linked_accounts) {
		if (account.type === "wallet" && "address" in account && account.address) {
			out.push(account.address);
		}
		if (
			account.type === "smart_wallet" &&
			"address" in account &&
			account.address
		) {
			out.push(account.address);
		}
	}
	return out;
}

/** Prefer explicit email login, then Google (matches client `email || google.email`). */
function canonicalEmailFromPrivyUser(user: User): string | null {
	for (const account of user.linked_accounts) {
		if (account.type === "email" && "address" in account && account.address) {
			return account.address;
		}
	}
	for (const account of user.linked_accounts) {
		if (
			account.type === "google_oauth" &&
			"email" in account &&
			account.email
		) {
			return account.email;
		}
	}
	return null;
}

/**
 * Verifies a Privy **identity** JWT and ensures linked wallets include `expectedWalletAddress`
 * when the token lists any wallets (same rules as registration).
 */
async function verifiedPrivyUserForWallet(
	identityToken: string,
	expectedWalletAddress: string,
): Promise<User> {
	const user = await privyClient.utils().auth().verifyIdentityToken(identityToken);

	const linked = linkedWalletAddresses(user);
	const normalizedExpected = expectedWalletAddress.toLowerCase();

	if (linked.length > 0) {
		const match = linked.some(
			(addr) => addr.toLowerCase() === normalizedExpected,
		);
		if (!match) {
			throw new Error(
				`Wallet address mismatch: identity token wallets do not include expected ${expectedWalletAddress}`,
			);
		}
	}

	return user;
}

export async function verifyPrivyTokenWithWallet(
	identityToken: string,
	expectedWalletAddress: string,
): Promise<PrivyAuthResult> {
	const user = await verifiedPrivyUserForWallet(
		identityToken,
		expectedWalletAddress,
	);

	const email = canonicalEmailFromPrivyUser(user);
	if (!email) {
		throw new Error(
			"Email is required for registration. Please log in with email or Google.",
		);
	}

	const linked = linkedWalletAddresses(user);
	const normalizedExpected = expectedWalletAddress.toLowerCase();
	const walletAddress =
		linked.find((addr) => addr.toLowerCase() === normalizedExpected) ??
		linked[0] ??
		null;

	return {
		privyDid: user.id,
		email,
		walletAddress,
	};
}

/** Canonical email from a verified identity token, or null if none linked. */
export async function verifiedPrivyEmailForWallet(
	identityToken: string,
	walletAddress: Address,
): Promise<string | null> {
	const user = await verifiedPrivyUserForWallet(identityToken, walletAddress);
	return canonicalEmailFromPrivyUser(user);
}
