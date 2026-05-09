import { PrivyClient } from "@privy-io/node";
import jwt from "jsonwebtoken";
import env from "@/env";

export interface PrivyAuthResult {
	privyDid: string;
	email: string | null;
	walletAddress: string | null;
}

export const privyClient = new PrivyClient({
	appId: env.PRIVY_APP_ID,
	appSecret: env.PRIVY_APP_SECRET,
});

export function verifyPrivyToken(idToken: string): PrivyAuthResult {
	try {
		const decoded = jwt.verify(idToken, env.PRIVY_VERIFICATION_KEY, {
			algorithms: ["ES256"],
		}) as {
			sub: string;
			email?: string;
			"custom:wallet_address"?: string;
		};

		return {
			privyDid: decoded.sub,
			email: decoded.email || null,
			walletAddress: decoded["custom:wallet_address"] || null,
		};
	} catch (error) {
		if (error instanceof jwt.JsonWebTokenError) {
			throw new Error(`Invalid Privy token: ${error.message}`);
		}
		if (error instanceof jwt.TokenExpiredError) {
			throw new Error("Privy token has expired");
		}
		throw new Error(
			`Failed to verify Privy token: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

export function verifyPrivyTokenWithWallet(
	idToken: string,
	expectedWalletAddress: string,
): PrivyAuthResult {
	const result = verifyPrivyToken(idToken);

	if (result.walletAddress) {
		const normalizedTokenWallet = result.walletAddress.toLowerCase();
		const normalizedExpected = expectedWalletAddress.toLowerCase();

		if (normalizedTokenWallet !== normalizedExpected) {
			throw new Error(
				`Wallet address mismatch: token wallet ${result.walletAddress} does not match expected ${expectedWalletAddress}`,
			);
		}
	}

	if (!result.email) {
		throw new Error(
			"Email is required for registration. Please log in with email or Google.",
		);
	}

	return result;
}
