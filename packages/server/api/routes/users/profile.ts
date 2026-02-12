import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { isAddress } from "viem";
import z from "zod";
import { authenticated } from "@/api/middleware/auth";
import db from "@/lib/db";
import { bucket } from "@/lib/s3/client";
import { respond } from "@/lib/utils/respond";

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
		const user = ctx.var.userWallet;

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

		const isApproved = await db.canSendTo({
			sender: user,
			recipient: userData.walletAddress,
		});

		if (!isApproved) {
			return respond.err(ctx, "You are not approved by this user", 401);
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
				has: {
					email: !!userData.email,
					mobile: !!userData.mobile,
				},
			},
			"User data retrieved",
			200,
		);
	});
