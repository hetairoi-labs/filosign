import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import z from "zod";
import { authenticated } from "@/api/middleware/auth";
import { KB } from "@/constants";
import db from "@/lib/db";
import { respond } from "@/lib/utils/respond";

const { userSignatures } = db.schema;
export default new Hono()

	.post(
		"/",
		authenticated,
		bodyLimit({
			maxSize: 30 * KB,
			onError: (ctx) => respond.err(ctx, "Request body too large", 413),
		}),
		async (ctx) => {
			const wallet = ctx.var.userWallet;
			const rawBody = await ctx.req.json();
			const parsedBody = z
				.object({
					data: z.string(),
				})
				.safeParse(rawBody);

			if (parsedBody.error) {
				return respond.err(ctx, parsedBody.error.message, 400);
			}

			try {
				await db.insert(userSignatures).values({
					walletAddress: wallet,
					data: parsedBody.data.data,
				});
			} catch (error) {
				return respond.err(ctx, `Failed to upload signature ${error}`, 500);
			}

			return respond.ok(ctx, {}, "Signature uploaded successfully", 201);
		},
	)

	.get("/", authenticated, async (ctx) => {
		const wallet = ctx.var.userWallet;
		const dbEntries = await db
			.select()
			.from(userSignatures)
			.where(eq(userSignatures.walletAddress, wallet));

		return respond.ok(
			ctx,
			{ signatures: dbEntries },
			"User signatures retrieved successfully",
			200,
		);
	})

	.get("/:id", authenticated, async (ctx) => {
		const wallet = ctx.var.userWallet;
		const signatureId = ctx.req.param("id");

		const [dbEntry] = await db
			.select()
			.from(userSignatures)
			.where(
				and(
					eq(userSignatures.id, signatureId),
					eq(userSignatures.walletAddress, wallet),
				),
			);

		if (!dbEntry) {
			return respond.err(ctx, "Signature not found", 404);
		}

		return respond.ok(ctx, dbEntry, "Signature retrieved successfully", 200);
	});
