import { Hono } from "hono";
import { z } from "zod";
import { authenticated } from "@/api/middleware/auth";
import db from "@/lib/db";
import { materializePendingInvitesForEmail } from "@/lib/domain/sharing";
import {
	verifiedLinkedEmailsForWallet,
	verifiedPrivyEmailForWallet,
} from "@/lib/utils/privy";
import { respond } from "@/lib/utils/respond";
import { tryCatch } from "@/lib/utils/tryCatch";

export default new Hono()
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
			const inviteRes = await tryCatch(
				materializePendingInvitesForEmail({
					walletAddress: wallet,
					email: email,
				}),
			);
			if (inviteRes.error) {
				console.error(
					"materializePendingInvitesForEmail (sync-privy-email):",
					inviteRes.error,
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
				email: z.email(),
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

		const inviteRes = await tryCatch(
			materializePendingInvitesForEmail({
				walletAddress: wallet,
				email: canonical,
			}),
		);
		if (inviteRes.error) {
			console.error(
				"materializePendingInvitesForEmail (set-primary-email):",
				inviteRes.error,
			);
		}

		return respond.ok(ctx, { email: canonical }, "Primary email updated", 200);
	});
