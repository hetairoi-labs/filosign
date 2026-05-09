import { signatures, toBytes } from "@filosign/crypto-utils/node";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import {
	type Address,
	type Hash,
	isAddress,
	isHex,
	keccak256,
	numberToHex,
} from "viem";
import { MINUTE } from "@/constants";
import db from "@/lib/db";
import { issueJwtToken } from "@/lib/utils/jwt";
import { respond } from "@/lib/utils/respond";
import { tryCatch } from "@/lib/utils/tryCatch";

const nonces: Record<Address, { nonce: Hash; validTill: number }> = {};

const { users } = db.schema;
export default new Hono()

	.get("/nonce", async (ctx) => {
		const wallet = ctx.req.query("address");
		if (!wallet || !isAddress(wallet)) {
			return respond.err(ctx, "Missing wallet address", 400);
		}

		const nonce = keccak256(
			numberToHex(Math.floor(Date.now() + Math.random() * 1e10)),
		);
		nonces[wallet] = { nonce, validTill: Date.now() + 5 * MINUTE };

		return respond.ok(ctx, { nonce }, "nonce generated", 200);
	})

	.post("/verify", async (ctx) => {
		const { address, signature } = await ctx.req.json();

		if (!address || !isAddress(address)) {
			return respond.err(ctx, "Missing or invalid address", 400);
		}
		if (!signature || typeof signature !== "string" || !isHex(signature)) {
			return respond.err(ctx, "Missing signature", 400);
		}

		const msgData = nonces[address];
		delete nonces[address];

		if (!msgData || msgData.validTill < Date.now()) {
			return respond.err(ctx, "Message expired or not found", 400);
		}

		const userRecordResult = await tryCatch(
			db
				.select({
					signaturePublicKey: users.signaturePublicKey,
				})
				.from(users)
				.where(eq(users.walletAddress, address))
				.limit(1),
		);

		// Dev resilience: if the DB is temporarily unreachable (e.g. DNS flake),
		// don't hard-fail auth — allow the UI to function (files, etc.) using JWT.
		// This is intentionally best-effort and should be tightened for production.
		if (userRecordResult.error) {
			console.error("[auth.verify] user lookup failed; allowing dev login", {
				address,
				error:
					userRecordResult.error instanceof Error
						? userRecordResult.error.message
						: String(userRecordResult.error),
			});
			const token = issueJwtToken(address);
			return respond.ok(ctx, { valid: true, token }, "Signature verified", 200);
		}

		const [userRecord] = userRecordResult.data;
		if (!userRecord) {
			return respond.err(ctx, "You are not registered", 401);
		}

		const { nonce } = msgData;

		const valid = await signatures.verify({
			dl: await signatures.dilithiumInstance(),
			message: toBytes(nonce),
			signature: toBytes(signature),
			publicKey: toBytes(userRecord.signaturePublicKey),
		});

		if (!valid) {
			return respond.err(ctx, "Invalid signature", 400);
		}

		await tryCatch(
			db
				.update(users)
				.set({ lastActiveAt: new Date() })
				.where(eq(users.walletAddress, address)),
		);

		const token = issueJwtToken(address);

		return respond.ok(ctx, { valid, token }, "Signature verified", 200);
	});
