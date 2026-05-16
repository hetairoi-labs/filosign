import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authenticated } from "@/api/middleware/auth";
import db from "@/lib/db";
import { respond } from "@/lib/utils/respond";
import { tryCatch } from "@/lib/utils/tryCatch";

const { shareRequests, userInvites, users } = db.schema;

export default new Hono()
	.get("/invite/:id", async (ctx) => {
		const id = ctx.req.param("id");
		if (!id) {
			return respond.err(ctx, "Invite ID is required", 400);
		}

		const result = await tryCatch(
			(async () => {
				const [invite] = await db
					.select({
						id: userInvites.id,
						inviteeEmail: userInvites.inviteeEmail,
						message: userInvites.message,
						createdAt: userInvites.createdAt,
						sender: userInvites.sender,
					})
					.from(userInvites)
					.where(eq(userInvites.id, id));

				if (!invite) {
					return { notFound: true as const };
				}

				const [sender] = await db
					.select({
						firstName: users.firstName,
						lastName: users.lastName,
						walletAddress: users.walletAddress,
					})
					.from(users)
					.where(eq(users.walletAddress, invite.sender));

				return {
					notFound: false as const,
					invite,
					sender,
				};
			})(),
		);

		if (result.error) {
			console.error("Error fetching invite:", result.error);
			return respond.err(ctx, "Failed to retrieve invite", 500);
		}

		const data = result.data;
		if (data.notFound) {
			return respond.err(ctx, "Invite not found or expired", 404);
		}

		const { invite, sender } = data;
		return respond.ok(
			ctx,
			{
				id: invite.id,
				inviteeEmail: invite.inviteeEmail,
				message: invite.message,
				createdAt: invite.createdAt,
				senderName: sender
					? `${sender.firstName || ""} ${sender.lastName || ""}`.trim() ||
						`${sender.walletAddress.slice(0, 6)}...${sender.walletAddress.slice(-4)}`
					: `${invite.sender.slice(0, 6)}...${invite.sender.slice(-4)}`,
			},
			"Invite details retrieved",
			200,
		);
	})
	.post("/invite/:id/claim", authenticated, async (ctx) => {
		const id = ctx.req.param("id");
		if (!id) {
			return respond.err(ctx, "Invite ID is required", 400);
		}

		const result = await tryCatch(
			db.transaction(async (tx) => {
				const [primaryInvite] = await tx
					.select()
					.from(userInvites)
					.where(eq(userInvites.id, id));

				if (!primaryInvite) {
					throw new Error("Invite not found");
				}

				const allInvites = await tx
					.select()
					.from(userInvites)
					.where(and(eq(userInvites.inviteeEmail, primaryInvite.inviteeEmail)));

				for (const invite of allInvites) {
					await tx.insert(shareRequests).values({
						senderWallet: invite.sender,
						recipientWallet: ctx.var.userWallet,
						message:
							invite.message ??
							`Auto-generated request from invite to ${invite.inviteeEmail}`,
						createdAt: invite.createdAt,
					});
					await tx.delete(userInvites).where(eq(userInvites.id, invite.id));
				}

				return primaryInvite;
			}),
		);

		if (result.error) {
			return respond.err(ctx, result.error.message, 400);
		}

		return respond.ok(ctx, result.data, "Invite claimed", 200);
	});
