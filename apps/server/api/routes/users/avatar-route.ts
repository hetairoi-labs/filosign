import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { authenticated } from "@/api/middleware/auth";
import db from "@/lib/db";
import { bucket } from "@/lib/s3/client";
import { respond } from "@/lib/utils/respond";

const { users } = db.schema;

/** Presigned/multipart carve-out: `PUT /api/users/profile/avatar` */
export default new Hono().put("/", authenticated, async (ctx) => {
	const wallet = ctx.var.userWallet;

	const formData = await ctx.req.formData();
	const file = formData.get("avatar") as File;

	if (!file) {
		return respond.err(ctx, "No avatar file provided", 400);
	}

	const parsedFile = z
		.object({
			size: z.number().max(32 * 1024, {
				error: "Avatar file must be 32KB or smaller",
			}),
			type: z.literal("image/webp", {
				error: "Avatar must be a WebP image",
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
});
