import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { Hono } from "hono";
import z from "zod";
import { fsContracts } from "@/lib/evm";
import { processTransaction } from "@/lib/indexer/process";
import { verifyPrivyTokenWithWallet } from "@/lib/utils/privy";
import { respond } from "@/lib/utils/respond";
import { tryCatch } from "@/lib/utils/tryCatch";

const { FSKeyRegistry } = fsContracts;

export default new Hono().post("/", async (ctx) => {
	const rawBody = await ctx.req.json();
	const parsedBody = z
		.object({
			saltPin: zHexString(),
			saltSeed: zHexString(),
			saltChallenge: zHexString(),
			commitmentKem: zHexString(),
			commitmentSig: zHexString(),
			signature: zHexString(),
			encryptionPublicKey: zHexString(),
			signaturePublicKey: zHexString(),
			walletAddress: zEvmAddress(),
			/** Privy identity JWT (`useIdentityToken`), not the access token from `getAccessToken`. */
			idToken: z.string().min(1).optional(),
			/** @internal For dev testing only - skips Privy token verification */
			skipToken: z.boolean().optional(),
		})
		.safeParse(rawBody);

	if (parsedBody.error) {
		return respond.err(ctx, parsedBody.error.message, 400);
	}

	const {
		saltPin,
		saltSeed,
		saltChallenge,
		commitmentKem,
		commitmentSig,
		signature,
		encryptionPublicKey,
		signaturePublicKey,
		walletAddress,
		idToken,
		skipToken,
	} = parsedBody.data;

	let email: string;
	let privyDid: string;

	if (skipToken) {
		// Dev testing mode - use wallet address as email and a mock privyDid
		email = `dev-${walletAddress}@filosign.local`;
		privyDid = `did:dev:${walletAddress}`;
	} else if (idToken) {
		const privyResult = await tryCatch(
			verifyPrivyTokenWithWallet(idToken, walletAddress),
		);

		if (privyResult.error) {
			return respond.err(
				ctx,
				`Privy verification failed: ${privyResult.error.message}`,
				401,
			);
		}

		email = privyResult.data.email ?? "";
		privyDid = privyResult.data.privyDid;
	} else {
		return respond.err(ctx, "idToken or skipToken required", 400);
	}

	if (!email) {
		return respond.err(
			ctx,
			"Email is required for registration. Please log in with email or Google.",
			400,
		);
	}

	const valid = await tryCatch(
		FSKeyRegistry.read.validateKeygenDataRegistrationSignature([
			saltPin,
			saltSeed,
			saltChallenge,
			commitmentKem,
			commitmentSig,
			signature,
			walletAddress,
		]),
	);

	if (valid.error || !valid.data) {
		return respond.err(ctx, `Error validating signature ${valid.error}`, 500);
	}

	const { FSManager } = fsContracts;
	const alreadyRegistered = await FSManager.read.isRegistered([walletAddress]);
	if (alreadyRegistered) {
		return respond.ok(ctx, {}, "Keygen data registered successfully", 200);
	}

	const txHash = await tryCatch(
		FSKeyRegistry.write.registerKeygenData([
			saltPin,
			saltSeed,
			saltChallenge,
			commitmentKem,
			commitmentSig,
			signature,
			walletAddress,
		]),
	);
	if (txHash.error || !txHash.data) {
		return respond.err(
			ctx,
			`Error registering keygen data: ${txHash.error || "Unknown error"}`,
			500,
		);
	}

	await processTransaction(txHash.data, {
		encryptionPublicKey,
		signaturePublicKey,
		email,
		privyDid,
	});

	return respond.ok(ctx, {}, "Keygen data registered successfully", 200);
});
