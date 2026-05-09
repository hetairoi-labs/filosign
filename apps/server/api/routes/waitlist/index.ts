import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { superAuth } from "@/api/middleware/super";
import db from "@/lib/db";
import { respond } from "@/lib/utils/respond";

const { waitlist: waitlistTable } = db.schema;

const waitlist = new Hono()
	.get("/", async (ctx) => {
		try {
			const email = ctx.req.query("email");

			if (!email || !z.email().safeParse(email).success) {
				return respond.err(ctx, "No email / invalid email", 400);
			}

			const existing = await db
				.select()
				.from(waitlistTable)
				.where(eq(waitlistTable.email, email))
				.limit(1);

			return respond.ok(
				ctx,
				{
					exists: existing.length > 0,
					email,
				},
				"Success",
				200,
			);
		} catch (error) {
			console.error("Database error:", error);
			return respond.err(ctx, "Failed to check email", 500);
		}
	})

	.post("/", async (ctx) => {
		const rawBody = await ctx.req.json();

		const parsedBody = z
			.object({
				email: z.email("Invalid email format"),
			})
			.safeParse(rawBody);

		if (parsedBody.error) {
			return respond.err(ctx, parsedBody.error.message, 400);
		}

		const { email } = parsedBody.data;

		try {
			// Check if email already exists
			const existing = await db
				.select()
				.from(waitlistTable)
				.where(eq(waitlistTable.email, email))
				.limit(1);

			if (existing.length > 0) {
				return respond.err(ctx, "Email already registered", 409);
			}

			// Insert new email
			await db.insert(waitlistTable).values({
				email,
			});

			return respond.ok(ctx, { email }, "Successfully added to waitlist", 201);
		} catch (error) {
			console.error("Database error:", error);
			return respond.err(ctx, "Failed to add to waitlist", 500);
		}
	})

	.delete("/", superAuth, async (ctx) => {
		try {
			const email = ctx.req.query("email");

			if (!email || !z.email().safeParse(email).success) {
				return respond.err(ctx, "Invalid email format", 400);
			}

			// Delete and check if email existed
			const deleted = await db
				.delete(waitlistTable)
				.where(eq(waitlistTable.email, email))
				.returning();

			if (deleted.length === 0) {
				return respond.err(ctx, "No such email", 404);
			}

			return respond.ok(
				ctx,
				{ email, deleted: true },
				"Successfully removed from waitlist",
				200,
			);
		} catch (error) {
			console.error("Database error:", error);
			return respond.err(ctx, "Failed to remove from waitlist", 500);
		}
	});

export default waitlist;
export type WaitlistType = typeof waitlist;
