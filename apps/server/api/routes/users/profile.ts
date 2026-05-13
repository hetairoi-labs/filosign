import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { isAddress } from "viem";
import z from "zod";
import { materializePendingInvitesForEmail } from "@/api/handlers/sharing";
import { authenticated } from "@/api/middleware/auth";
import db from "@/lib/db";
import { fsContracts } from "@/lib/evm";
import { processTransaction } from "@/lib/indexer/process";
import { bucket } from "@/lib/s3/client";
import {
	verifiedLinkedEmailsForWallet,
	verifiedPrivyEmailForWallet,
	verifyPrivyTokenWithWallet,
} from "@/lib/utils/privy";
import { respond } from "@/lib/utils/respond";
import { tryCatch } from "@/lib/utils/tryCatch";

const { FSKeyRegistry } = fsContracts;

const { users } = db.schema;
export default new Hono()
	.get("/", authenticated, async (ctx) => {
		const wallet = ctx.var.userWallet;
		const [userData] = await db
			.select({
				walletAddress: users.walletAddress,
				encryptionPublicKey: users.encryptionPublicKey,
				keygenData: users.keygenDataJson,
				createdAt: users.createdAt,
				email: users.email,
				username: users.username,
				firstName: users.firstName,
				lastName: users.lastName,
				avatarKey: users.avatarKey,
			})
			.from(users)
			.where(eq(users.walletAddress, wallet));

		if (!userData) {
			return respond.err(ctx, "User not found", 404);
		}

		let avatarUrl: string | null = null;
		if (userData.avatarKey) {
			avatarUrl = bucket.presign(userData.avatarKey, {
				method: "GET",
				expiresIn: 60 * 60 * 24, // 1 day
			});
		}

		return respond.ok(
			ctx,
			{ ...userData, avatarUrl },
			"User data retrieved",
			200,
		);
	})

	.post("/sync-privy-email", authenticated, async (ctx) => {
		const wallet = ctx.var.userWallet;
		const rawBody = await ctx.req.json();
		const parsedBody = z
			.object({
				identityToken: z.string().min(1),
			})
			.safeParse(rawBody);

		if (parsedBody.error) {
			return respond.err(ctx, parsedBody.error.message, 400);
		}

		const emailResult = await tryCatch(
			verifiedPrivyEmailForWallet(parsedBody.data.identityToken, wallet),
		);

		if (emailResult.error) {
			return respond.err(
				ctx,
				`Privy verification failed: ${emailResult.error.message}`,
				401,
			);
		}

		const email = emailResult.data;
		if (!email) {
			return respond.ok(
				ctx,
				{ updated: false },
				"No email on this Privy identity token",
				200,
			);
		}

		await db.updateUserFieldWithLog({
			walletAddress: wallet,
			fieldName: "email",
			newValue: email,
		});

		if (email?.trim()) {
			try {
				await materializePendingInvitesForEmail({
					walletAddress: wallet,
					email: email,
				});
			} catch (e) {
				console.error(
					"materializePendingInvitesForEmail (sync-privy-email):",
					e,
				);
			}
		}

		return respond.ok(
			ctx,
			{ updated: true, email },
			"Email synced from Privy",
			200,
		);
	})

	.post("/set-primary-email", authenticated, async (ctx) => {
		const wallet = ctx.var.userWallet;
		const rawBody = await ctx.req.json();
		const parsedBody = z
			.object({
				identityToken: z.string().min(1),
				email: z.string().email(),
			})
			.safeParse(rawBody);

		if (parsedBody.error) {
			return respond.err(ctx, parsedBody.error.message, 400);
		}

		const { identityToken, email: requestedRaw } = parsedBody.data;
		const linkedResult = await tryCatch(
			verifiedLinkedEmailsForWallet(identityToken, wallet),
		);

		if (linkedResult.error) {
			return respond.err(
				ctx,
				`Privy verification failed: ${linkedResult.error.message}`,
				401,
			);
		}

		const linked = linkedResult.data;
		const normalizedRequested = requestedRaw.trim().toLowerCase();
		const canonical = linked.find(
			(e) => e.toLowerCase() === normalizedRequested,
		);

		if (!canonical) {
			return respond.err(
				ctx,
				"This email is not linked to your Privy account.",
				400,
			);
		}

		await db.updateUserFieldWithLog({
			walletAddress: wallet,
			fieldName: "email",
			newValue: canonical,
		});

		try {
			await materializePendingInvitesForEmail({
				walletAddress: wallet,
				email: canonical,
			});
		} catch (e) {
			console.error(
				"materializePendingInvitesForEmail (set-primary-email):",
				e,
			);
		}

		return respond.ok(ctx, { email: canonical }, "Primary email updated", 200);
	})

	.post("/", async (ctx) => {
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
		const alreadyRegistered = await FSManager.read.isRegistered([
			walletAddress,
		]);
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
	})

	.put("/", authenticated, async (ctx) => {
		const wallet = ctx.var.userWallet;
		const rawBody = await ctx.req.json();

		const parsedBody = z
			.object({
				email: z.string().email("Invalid email format").optional(),
				username: z
					.string()
					.min(3, "Username must be at least 3 characters")
					.max(16, "Username must be at most 16 characters")
					.optional(),
				firstName: z
					.string()
					.min(1, "First name must be at least 1 character")
					.max(50, "First name must be at most 50 characters")
					.optional(),
				lastName: z
					.string()
					.min(1, "Last name must be at least 1 character")
					.max(50, "Last name must be at most 50 characters")
					.optional(),
			})
			.safeParse(rawBody);

		if (parsedBody.error) {
			return respond.err(ctx, parsedBody.error.message, 400);
		}

		const {
			email: emailRaw,
			username: usernameRaw,
			firstName: firstNameRaw,
			lastName: lastNameRaw,
		} = parsedBody.data;

		const email = emailRaw?.trim();
		const username = usernameRaw?.trim();
		const firstName = firstNameRaw?.trim();
		const lastName = lastNameRaw?.trim();

		await db.updateUserFieldWithLog({
			walletAddress: wallet,
			fieldName: "email",
			newValue: email,
		});
		await db.updateUserFieldWithLog({
			walletAddress: wallet,
			fieldName: "username",
			newValue: username,
		});
		await db.updateUserFieldWithLog({
			walletAddress: wallet,
			fieldName: "firstName",
			newValue: firstName,
		});
		await db.updateUserFieldWithLog({
			walletAddress: wallet,
			fieldName: "lastName",
			newValue: lastName,
		});

		if (email?.trim()) {
			try {
				await materializePendingInvitesForEmail({
					walletAddress: wallet,
					email: email,
				});
			} catch (e) {
				console.error("materializePendingInvitesForEmail (profile PUT):", e);
			}
		}

		return respond.ok(ctx, {}, "Profile updated successfully", 200);
	})

	.put("/avatar", authenticated, async (ctx) => {
		const wallet = ctx.var.userWallet;

		const formData = await ctx.req.formData();
		const file = formData.get("avatar") as File;

		if (!file) {
			return respond.err(ctx, "No avatar file provided", 400);
		}

		const parsedFile = z
			.object({
				size: z.number().max(32 * 1024, "Avatar file must be 32KB or smaller"),
				type: z.literal("image/webp", {
					message: "Avatar must be a WebP image",
				}),
			})
			.safeParse({
				size: file.size,
				type: file.type,
			});

		if (parsedFile.error) {
			return respond.err(ctx, parsedFile.error.message, 400);
		}

		const buffer = await file.arrayBuffer();

		const key = `avatars/${wallet}.webp`;
		await bucket.write(key, buffer, {
			type: "image/webp",
			acl: "public-read",
		});

		await db
			.update(users)
			.set({ avatarKey: key })
			.where(eq(users.walletAddress, wallet));

		return respond.ok(
			ctx,
			{ avatarKey: key },
			"Avatar uploaded successfully",
			200,
		);
	})

	.get("/prevalidate", authenticated, async (ctx) => {
		const { email, username } = ctx.req.query();

		if (email) {
			const [existingByEmail] = await db
				.select()
				.from(users)
				.where(eq(users.email, email as string));

			if (existingByEmail) {
				return respond.ok(ctx, { valid: false }, "Email already in use", 200);
			}
		}

		if (username) {
			const [existingByUsername] = await db
				.select()
				.from(users)
				.where(eq(users.username, username as string));
			if (existingByUsername) {
				return respond.ok(
					ctx,
					{ valid: false },
					"Username already in use",
					200,
				);
			}
		}

		return respond.ok(ctx, { valid: true }, "Valid for update", 200);
	})

	.get("/:q", authenticated, async (ctx) => {
		const q = ctx.req.param("q");

		const returns = {
			walletAddress: users.walletAddress,
			encryptionPublicKey: users.encryptionPublicKey,
			lastActiveAt: users.lastActiveAt,
			createdAt: users.createdAt,
			firstName: users.firstName,
			lastName: users.lastName,
			avatarKey: users.avatarKey,
			email: users.email,
			mobile: users.mobile,
		};

		let [userData] = await db
			.select(returns)
			.from(users)
			.where(eq(users.email, q));
		if (!userData && isAddress(q)) {
			[userData] = await db
				.select(returns)
				.from(users)
				.where(eq(users.walletAddress, q));
		}
		if (!userData) {
			[userData] = await db
				.select(returns)
				.from(users)
				.where(eq(users.username, q));
		}

		if (!userData) {
			return respond.err(ctx, "User not found", 404);
		}

		let avatarUrl: string | null = null;
		if (userData.avatarKey) {
			avatarUrl = bucket.presign(userData.avatarKey as string, {
				method: "GET",
				expiresIn: 60 * 60 * 24, // 1 day
			});
		}

		return respond.ok(
			ctx,
			{
				walletAddress: userData.walletAddress,
				encryptionPublicKey: userData.encryptionPublicKey,
				lastActiveAt: userData.lastActiveAt,
				createdAt: userData.createdAt,
				firstName: userData.firstName,
				lastName: userData.lastName,
				avatarUrl,
				email: userData.email ?? null,
				has: {
					email: !!userData.email,
					mobile: !!userData.mobile,
				},
			},
			"User data retrieved",
			200,
		);
	});
