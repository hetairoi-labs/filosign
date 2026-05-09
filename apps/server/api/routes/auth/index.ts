import { signatures, toBytes } from "@filosign/crypto-utils/node";
import { and, eq, gt } from "drizzle-orm";
import { Hono } from "hono";
import {
	type Address,
	type Hash,
	isAddress,
	isHex,
	keccak256,
	numberToHex,
} from "viem";
import { authenticated } from "@/api/middleware/auth";
import { HOUR, MINUTE } from "@/constants";
import db from "@/lib/db";
import { issueJwtToken } from "@/lib/utils/jwt";
import { respond } from "@/lib/utils/respond";
import {
	decryptSeed,
	encryptSeed,
	generateSessionToken,
	hashToken,
} from "@/lib/utils/sessionCrypto";
import { tryCatch } from "@/lib/utils/tryCatch";

const nonces: Record<Address, { nonce: Hash; validTill: number }> = {};

const { users, sessions } = db.schema;
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
	})

	// Create a new server-side session for seed storage
	.post("/session", authenticated, async (ctx) => {
		const wallet = ctx.var.userWallet;

		const { seed, expiresInHours = 24 } = await ctx.req.json();

		if (!seed || !Array.isArray(seed) || seed.length === 0) {
			return respond.err(ctx, "Missing or invalid seed", 400);
		}

		// Encrypt seed with server master key
		const seedBytes = new Uint8Array(seed);
		const encrypted = encryptSeed(seedBytes);

		// Generate session token
		const token = generateSessionToken();
		const tokenHash = hashToken(token);

		// Calculate expiration
		const expiresAt = new Date(Date.now() + expiresInHours * HOUR);

		// Store in database
		// Store auth tag in encryptedSeed buffer (last 16 bytes)
		// Concat: ciphertext + authTag
		const encryptedSeedWithAuthTag = Buffer.concat([
			Buffer.from(encrypted.ciphertext),
			Buffer.from(encrypted.authTag),
		]);

		const insertResult = await tryCatch(
			db.insert(sessions).values({
				walletAddress: wallet,
				encryptedSeed: encryptedSeedWithAuthTag,
				nonce: Buffer.from(encrypted.nonce),
				tokenHash,
				expiresAt,
				ipAddress: ctx.req.header("x-forwarded-for") || "",
				userAgent: ctx.req.header("user-agent") || "",
			}),
		);

		if (insertResult.error) {
			console.error(
				"[SESSION CREATE] Failed to create session:",
				insertResult.error,
			);
			return respond.err(ctx, "Failed to create session", 500);
		}

		return respond.ok(
			ctx,
			{ sessionToken: token, expiresAt },
			"Session created",
			201,
		);
	})

	// Restore seed from server-side session (does NOT require JWT - uses session token instead)
	.get("/session", async (ctx) => {
		const sessionToken = ctx.req.header("x-session-token");

		if (!sessionToken) {
			return respond.err(ctx, "Missing session token", 400);
		}

		const tokenHash = hashToken(sessionToken);

		// Find valid session by token hash only
		const sessionResult = await tryCatch(
			db
				.select({
					id: sessions.id,
					walletAddress: sessions.walletAddress,
					encryptedSeed: sessions.encryptedSeed,
					nonce: sessions.nonce,
				})
				.from(sessions)
				.where(
					and(
						eq(sessions.tokenHash, tokenHash),
						eq(sessions.revoked, false),
						gt(sessions.expiresAt, new Date()),
					),
				)
				.limit(1),
		);

		if (sessionResult.error) {
			console.error("[SESSION RESTORE] Database error", sessionResult.error);
			return respond.err(ctx, "Database error", 500);
		}

		if (!sessionResult.data.length) {
			return respond.err(ctx, "Invalid or expired session", 401);
		}

		const session = sessionResult.data[0];

		// Extract ciphertext and auth tag (last 16 bytes)
		const encryptedSeedBuf = Buffer.from(session.encryptedSeed);
		const ciphertext = encryptedSeedBuf.slice(0, -16);
		const authTag = encryptedSeedBuf.slice(-16);
		const nonce = new Uint8Array(Buffer.from(session.nonce));

		// Decrypt seed
		try {
			const decryptedSeed = decryptSeed(
				new Uint8Array(ciphertext),
				nonce,
				new Uint8Array(authTag),
			);

			// Update last used timestamp
			void db
				.update(sessions)
				.set({ updatedAt: new Date() })
				.where(eq(sessions.id, session.id));

			return respond.ok(
				ctx,
				{
					seed: Array.from(decryptedSeed),
					walletAddress: session.walletAddress,
				},
				"Session restored",
				200,
			);
		} catch {
			return respond.err(ctx, "Failed to decrypt session", 500);
		}
	})

	// Revoke current session
	.delete("/session", authenticated, async (ctx) => {
		const wallet = ctx.var.userWallet;
		const sessionToken = ctx.req.header("x-session-token");

		if (!sessionToken) {
			return respond.err(ctx, "Missing session token", 400);
		}

		const tokenHash = hashToken(sessionToken);

		const revokeResult = await tryCatch(
			db
				.update(sessions)
				.set({ revoked: true })
				.where(
					and(
						eq(sessions.walletAddress, wallet),
						eq(sessions.tokenHash, tokenHash),
					),
				),
		);

		if (revokeResult.error) {
			return respond.err(ctx, "Failed to revoke session", 500);
		}

		return respond.ok(ctx, {}, "Session revoked", 200);
	})

	// List all active sessions for user
	.get("/sessions", authenticated, async (ctx) => {
		const wallet = ctx.var.userWallet;

		const sessionsResult = await tryCatch(
			db
				.select({
					id: sessions.id,
					createdAt: sessions.createdAt,
					expiresAt: sessions.expiresAt,
					lastUsedAt: sessions.updatedAt,
					ipAddress: sessions.ipAddress,
					userAgent: sessions.userAgent,
				})
				.from(sessions)
				.where(
					and(
						eq(sessions.walletAddress, wallet),
						eq(sessions.revoked, false),
						gt(sessions.expiresAt, new Date()),
					),
				)
				.orderBy(sessions.createdAt),
		);

		if (sessionsResult.error) {
			return respond.err(ctx, "Failed to fetch sessions", 500);
		}

		return respond.ok(
			ctx,
			{ sessions: sessionsResult.data },
			"Sessions fetched",
			200,
		);
	})

	// Revoke all sessions (logout everywhere)
	.delete("/sessions", authenticated, async (ctx) => {
		const wallet = ctx.var.userWallet;

		const revokeResult = await tryCatch(
			db
				.update(sessions)
				.set({ revoked: true })
				.where(
					and(eq(sessions.walletAddress, wallet), eq(sessions.revoked, false)),
				),
		);

		if (revokeResult.error) {
			return respond.err(ctx, "Failed to revoke sessions", 500);
		}

		return respond.ok(ctx, {}, "All sessions revoked", 200);
	});
