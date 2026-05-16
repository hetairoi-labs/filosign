import { signatures, toBytes } from "@filosign/crypto-utils/node";
import { zHexString } from "@filosign/shared/zod";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import {
	type Address,
	type Hash,
	isAddress,
	keccak256,
	numberToHex,
} from "viem";
import z from "zod";
import { MINUTE } from "@/constants";
import db from "@/lib/db";
import { issueJwtToken } from "@/lib/utils/jwt";
import { respond } from "@/lib/utils/respond";
import { tryCatch } from "@/lib/utils/tryCatch";
import { zodSafeParseMessage } from "@/lib/utils/zodHttp";

const nonces: Record<Address, { nonce: Hash; validTill: number }> = {};

const { users } = db.schema;

const zAuthVerifyBody = z.object({
	address: z.string().refine((v) => isAddress(v), {
		error: "Invalid address",
	}),
	signature: zHexString(),
});

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
		let rawBody: unknown;
		try {
			rawBody = await ctx.req.json();
		} catch {
			return respond.err(ctx, "Invalid JSON body", 400);
		}

		const parsed = zAuthVerifyBody.safeParse(rawBody);
		if (!parsed.success) {
			return respond.err(ctx, zodSafeParseMessage(parsed.error), 400);
		}

		const { address, signature } = parsed.data;

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

		if (userRecordResult.error) {
			console.error("[auth.verify] user lookup failed", {
				address,
				error:
					userRecordResult.error instanceof Error
						? userRecordResult.error.message
						: String(userRecordResult.error),
			});
			return respond.err(ctx, "Authentication temporarily unavailable", 503);
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
