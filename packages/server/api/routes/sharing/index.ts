import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getAddress, isAddress } from "viem";
import z from "zod";
import { authenticated } from "@/api/middleware/auth";
import db from "@/lib/db";
import { evmClient, fsContracts } from "@/lib/evm";
import { processTransaction } from "@/lib/indexer/process";
import { respond } from "@/lib/utils/respond";
import { tryCatch } from "@/lib/utils/tryCatch";

// Base hours for spam prevention: wait this^(cancelled_count) hours after cancelling
const REQUEST_SPAM_BASE_HOURS = 3;

const { shareApprovals, shareRequests, userInvites, users } = db.schema;
const { FSManager } = fsContracts;
export default new Hono()
	.post("/request", authenticated, async (ctx) => {
		const { recipientWallet, message } = await ctx.req.json();

		if (!recipientWallet || !isAddress(recipientWallet)) {
			return respond.err(ctx, "Invalid recipientWallet", 400);
		}

		const recipient = getAddress(recipientWallet);
		const sender = ctx.var.userWallet;

		if (recipient === sender) {
			return respond.err(ctx, "Don't ask yourself for permission", 400);
		}

		const [existingRequest] = await db
			.select()
			.from(shareRequests)
			.where(
				and(
					eq(shareRequests.senderWallet, sender),
					eq(shareRequests.recipientWallet, recipient),
					eq(shareRequests.status, "PENDING"),
				),
			);

		if (existingRequest) {
			return respond.err(ctx, "A pending request already exists", 409);
		}

		const [latestApproval] = await db
			.select()
			.from(shareApprovals)
			.where(
				and(
					eq(shareApprovals.senderWallet, sender),
					eq(shareApprovals.recipientWallet, recipient),
				),
			)
			.orderBy(desc(shareApprovals.createdAt))
			.limit(1);

		if (latestApproval?.active) {
			return respond.err(ctx, "Already approved", 409);
		}

		// spam prevention: count cancelled requests
		const cancelledRequests = await db
			.select()
			.from(shareRequests)
			.where(
				and(
					eq(shareRequests.senderWallet, sender),
					eq(shareRequests.recipientWallet, recipient),
					eq(shareRequests.status, "CANCELLED"),
				),
			)
			.orderBy(desc(shareRequests.createdAt));

		if (cancelledRequests.length > 0) {
			const lastCancelled = cancelledRequests[0];
			const hoursSinceCancel =
				(Date.now() - Number(lastCancelled.createdAt)) / (1000 * 60 * 60);
			const requiredWaitHours =
				REQUEST_SPAM_BASE_HOURS ** cancelledRequests.length;

			if (hoursSinceCancel < requiredWaitHours) {
				const remainingHours = Math.ceil(requiredWaitHours - hoursSinceCancel);
				return respond.err(
					ctx,
					`Please wait ${remainingHours} more hours before sending another request (spam prevention)`,
					429,
				);
			}
		}

		const [newRequest] = await db
			.insert(shareRequests)
			.values({
				senderWallet: sender,
				recipientWallet: recipient,
				message: message || null,
			})
			.returning({
				id: shareRequests.id,
				senderWallet: shareRequests.senderWallet,
				recipientWallet: shareRequests.recipientWallet,
				message: shareRequests.message,
				status: shareRequests.status,
				createdAt: shareRequests.createdAt,
			});

		return respond.ok(ctx, newRequest, "Share request created", 201);
	})
	// TODO - @kartikay please implement the email sending logic and encode invite ID in sent link
	.post("/request/invite", authenticated, async (ctx) => {
		const { inviteeEmail, message } = await ctx.req.json();

		if (
			!inviteeEmail ||
			typeof inviteeEmail !== "string" ||
			!inviteeEmail.includes("@")
		) {
			return respond.err(ctx, "Invalid inviteeEmail", 400);
		}

		if (message && (typeof message !== "string" || message.length > 500)) {
			return respond.err(ctx, "Invalid message", 400);
		}

		const [self] = await db
			.select()
			.from(users)
			.where(eq(users.walletAddress, ctx.var.userWallet));

		if (!self.email) {
			return respond.err(
				ctx,
				"You must have an email associated with your account to send invites",
				400,
			);
		}

		const [existingUser] = await db
			.select()
			.from(users)
			.where(eq(users.email, inviteeEmail));

		ctx.res.headers.set("Location", `/api/sharing/request`);

		if (existingUser) {
			return respond.ok(
				ctx,
				{ address: existingUser.walletAddress },
				"Email is already registered on the platform, request by address instead",
				303,
			);
		}

		const [existingInvite] = await db
			.select()
			.from(userInvites)
			.where(
				and(
					eq(userInvites.sender, ctx.var.userWallet),
					eq(userInvites.inviteeEmail, inviteeEmail),
				),
			);

		if (existingInvite) {
			return respond.err(
				ctx,
				"An invite to this email from you already exists",
				409,
			);
		}

		const [newInvite] = await db
			.insert(userInvites)
			.values({
				sender: ctx.var.userWallet,
				inviteeEmail,
				message: message ?? null,
			})
			.returning();

		return respond.ok(ctx, newInvite, "Invite sent", 201);
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
	})
	.get("/received", authenticated, async (ctx) => {
		const userWallet = ctx.var.userWallet;

		try {
			const requests = await db
				.select({
					id: shareRequests.id,
					senderWallet: shareRequests.senderWallet,
					recipientWallet: shareRequests.recipientWallet,
					message: shareRequests.message,
					status: shareRequests.status,
					createdAt: shareRequests.createdAt,
					updatedAt: shareRequests.updatedAt,
				})
				.from(shareRequests)
				.where(eq(shareRequests.recipientWallet, userWallet))
				.orderBy(desc(shareRequests.createdAt));

			return respond.ok(ctx, { requests }, "Received requests retrieved", 200);
		} catch (error) {
			console.error("Error fetching received share requests", error);
			return respond.err(ctx, "Failed to retrieve received requests", 500);
		}
	})
	.get("/sent", authenticated, async (ctx) => {
		const userWallet = ctx.var.userWallet;

		try {
			const requests = await db
				.select({
					id: shareRequests.id,
					senderWallet: shareRequests.senderWallet,
					recipientWallet: shareRequests.recipientWallet,
					message: shareRequests.message,
					status: shareRequests.status,
					createdAt: shareRequests.createdAt,
					updatedAt: shareRequests.updatedAt,
				})
				.from(shareRequests)
				.where(eq(shareRequests.senderWallet, userWallet))
				.orderBy(desc(shareRequests.createdAt));

			return respond.ok(ctx, { requests }, "Sent requests retrieved", 200);
		} catch (error) {
			console.error("Error fetching sent share requests", error);
			return respond.err(ctx, "Failed to retrieve sent requests", 500);
		}
	})
	.get("/can-send-to", authenticated, async (ctx) => {
		const { recipient } = ctx.req.query();
		if (!recipient || !isAddress(recipient)) {
			return respond.err(ctx, "Invalid recipient", 400);
		}
		const recipientAddr = getAddress(recipient);
		const sender = ctx.var.userWallet;
		if (recipientAddr === sender) {
			return respond.ok(
				ctx,
				{ canSend: false, reason: "Cannot send to yourself" },
				"Checked send capability",
				200,
			);
		}
		const [latestApproval] = await db
			.select()
			.from(shareApprovals)
			.where(
				and(
					eq(shareApprovals.senderWallet, sender),
					eq(shareApprovals.recipientWallet, recipientAddr),
				),
			)
			.orderBy(desc(shareApprovals.createdAt))
			.limit(1);
		const canSend = latestApproval ? latestApproval.active : false;
		return respond.ok(
			ctx,
			{ canSend, reason: canSend ? null : "No active approval" },
			"Checked send capability",
			200,
		);
	})
	.delete("/:id/cancel", authenticated, async (ctx) => {
		const id = ctx.req.param("id");
		const userWallet = ctx.var.userWallet;
		const [approval] = await db
			.select()
			.from(shareRequests)
			.where(
				and(
					eq(shareRequests.id, id),
					eq(shareRequests.senderWallet, userWallet),
					eq(shareRequests.status, "PENDING"),
				),
			);
		if (!approval) {
			return respond.err(ctx, "Approval not found or cannot cancel", 404);
		}
		await db
			.update(shareRequests)
			.set({ status: "CANCELLED" })
			.where(eq(shareRequests.id, id));
		return respond.ok(ctx, {}, "Request cancelled", 200);
	})
	.delete("/:id/reject", authenticated, async (ctx) => {
		const id = ctx.req.param("id");
		const userWallet = ctx.var.userWallet;
		const [approval] = await db
			.select()
			.from(shareRequests)
			.where(
				and(
					eq(shareRequests.id, id),
					eq(shareRequests.recipientWallet, userWallet),
					eq(shareRequests.status, "PENDING"),
				),
			);
		if (!approval) {
			return respond.err(ctx, "Request not found or cannot reject", 404);
		}
		await db
			.update(shareRequests)
			.set({ status: "REJECTED" })
			.where(eq(shareRequests.id, id));
		return respond.ok(ctx, {}, "Request rejected", 200);
	})
	.post("/:id/accept", authenticated, async (ctx) => {
		const id = ctx.req.param("id");
		const userWallet = ctx.var.userWallet;
		const [request] = await db
			.select()
			.from(shareRequests)
			.where(
				and(
					eq(shareRequests.id, id),
					eq(shareRequests.recipientWallet, userWallet),
					eq(shareRequests.status, "PENDING"),
				),
			);
		if (!request) {
			return respond.err(ctx, "Request not found or cannot accept", 404);
		}

		// Update request status
		await db
			.update(shareRequests)
			.set({ status: "ACCEPTED" })
			.where(eq(shareRequests.id, id));

		return respond.ok(ctx, {}, "Request accepted", 200);
	})
	.post("/approve", authenticated, async (ctx) => {
		const recipient = ctx.var.userWallet;
		const rawBody = await ctx.req.json();

		const parsedBody = z
			.object({
				sender: zEvmAddress(),
				nonce: z.coerce.bigint(),
				deadline: z.coerce.bigint(),
				signature: zHexString(),
			})
			.safeParse(rawBody);

		if (parsedBody.error) {
			return respond.err(ctx, parsedBody.error.message, 400);
		}

		const { sender, nonce, deadline, signature } = parsedBody.data;

		const args = [
			recipient,
			getAddress(sender),
			nonce,
			deadline,
			signature,
		] as const;

		try {
			// Use address only: avoids viem duplicate-version Account type mismatches in tooling.
			await FSManager.simulate.approveSender(args, {
				account: evmClient.account.address,
			});
		} catch (_err) {
			return respond.err(ctx, "Invalid signature", 400);
		}

		const txHash = await FSManager.write.approveSender(args);
		await processTransaction(txHash, {});

		return respond.ok(ctx, { txHash }, "Sender approved", 201);
	})
	.get("/receivable-from", authenticated, async (ctx) => {
		const userWallet = ctx.var.userWallet;

		const subquery = db
			.select({
				senderWallet: shareApprovals.senderWallet,
				maxCreatedAt: sql<Date>`max(${shareApprovals.createdAt})`,
			})
			.from(shareApprovals)
			.where(eq(shareApprovals.recipientWallet, userWallet))
			.groupBy(shareApprovals.senderWallet)
			.as("subquery");

		const approvals = await db
			.select({
				senderWallet: shareApprovals.senderWallet,
				active: shareApprovals.active,
				createdAt: shareApprovals.createdAt,
			})
			.from(shareApprovals)
			.innerJoin(
				subquery,
				and(
					eq(shareApprovals.senderWallet, subquery.senderWallet),
					eq(shareApprovals.createdAt, subquery.maxCreatedAt),
				),
			);

		return respond.ok(ctx, { approvals }, "Receivable from retrieved", 200);
	})
	.get("/sendable-to", authenticated, async (ctx) => {
		const userWallet = ctx.var.userWallet;

		const subquery = db
			.select({
				recipientWallet: shareApprovals.recipientWallet,
				maxCreatedAt: sql<Date>`max(${shareApprovals.createdAt})`,
			})
			.from(shareApprovals)
			.where(eq(shareApprovals.senderWallet, userWallet))
			.groupBy(shareApprovals.recipientWallet)
			.as("subquery");

		const approvals = await db
			.select({
				recipientWallet: shareApprovals.recipientWallet,
				active: shareApprovals.active,
				createdAt: shareApprovals.createdAt,
			})
			.from(shareApprovals)
			.innerJoin(
				subquery,
				and(
					eq(shareApprovals.recipientWallet, subquery.recipientWallet),
					eq(shareApprovals.createdAt, subquery.maxCreatedAt),
				),
			);

		return respond.ok(ctx, { approvals }, "Sendable to retrieved", 200);
	});
