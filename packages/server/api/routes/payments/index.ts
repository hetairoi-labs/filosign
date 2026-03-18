import { validateEvent } from "@polar-sh/sdk/webhooks";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getAddress } from "viem";
import { authenticated } from "@/api/middleware/auth";
import env from "@/env";
import db from "@/lib/db";
import { users } from "@/lib/db/schema";
import { polar } from "@/lib/utils/polar";
import { respond } from "@/lib/utils/respond";
import tryCatchSync, { tryCatch } from "@/lib/utils/tryCatch";

export default new Hono()
	.post("/checkout/create", authenticated, async (ctx) => {
		const walletAddress = ctx.var.userWallet;

		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.walletAddress, walletAddress));

		if (!user) {
			return respond.err(ctx, "User not found", 404);
		}

		if (user.subscriptionStatus === "premium") {
			return respond.err(ctx, "User already has a subscription", 400);
		}

		const checkout = await polar.checkouts.create({
			products: [env.POLAR_PRODUCT_ID],
			successUrl: env.POLAR_SUCCESS_URL,
			metadata: {
				walletAddress,
			},
		});

		return respond.ok(
			ctx,
			{
				checkoutId: checkout.id,
				checkoutUrl: checkout.url,
			},
			"Checkout created successfully",
			201,
		);
	})
	.post("/webhooks", async (ctx) => {
		const body = await ctx.req.text();
		const headers = ctx.req.header();

		const { data: event, error } = tryCatchSync(() =>
			validateEvent(body, headers, env.POLAR_WEBHOOK_SECRET),
		);

		if (error) {
			console.error("Webhook signature verification failed", error);
			return respond.err(ctx, "Invalid signature", 401);
		}

		switch (event.type) {
			case "subscription.active":
			case "subscription.created":
			case "subscription.uncanceled":
			case "subscription.updated": {
				const sub = event.data;
				console.log("sub", sub);
				const addr = getAddress(sub.metadata?.walletAddress as string);

				const { data: result, error } = await tryCatch(
					db
						.update(users)
						.set({
							subscriptionStatus: "premium",
							subscriptionId: sub.id,
							subscriptionExpiry: sub.endsAt,
						})
						.where(eq(users.walletAddress, addr))
						.returning({ walletAddress: users.walletAddress }),
				);

				if (error) {
					console.error("FAILED TO UPDATE USER SUBSCRIPTION IN DB");
					return respond.err(ctx, error.message, 500);
				}

				if (result?.length === 0) {
					console.error("WEBHOOK: Wallet not found in DB", addr);
					return respond.ok(ctx, {}, "User not found", 200);
				}

				return respond.ok(ctx, {}, "Access synced", 200);
			}
			case "subscription.revoked": {
				const sub = event.data;
				const result = await tryCatch(
					db
						.update(users)
						.set({ subscriptionStatus: "basic", subscriptionId: null })
						.where(eq(users.subscriptionId, sub.id))
						.returning({ walletAddress: users.walletAddress }),
				);
				if (result.error) return respond.err(ctx, "DB Error", 500);
				return respond.ok(ctx, {}, "Subscription revoked successfully", 200);
			}
			case "subscription.canceled": {
				const sub = event.data;
				const result = await tryCatch(
					db
						.update(users)
						.set({ subscriptionExpiry: sub.endsAt })
						.where(eq(users.subscriptionId, sub.id))
						.returning({ walletAddress: users.walletAddress }),
				);
				if (result.error) return respond.err(ctx, "DB Error", 500);
				return respond.ok(ctx, {}, "Subscription canceled successfully", 200);
			}
		}

		return ctx.json({ received: true }, 200);
	});
