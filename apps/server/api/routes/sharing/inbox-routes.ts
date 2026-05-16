import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getAddress, isAddress } from "viem";
import z from "zod";
import { authenticated } from "@/api/middleware/auth";
import db from "@/lib/db";
import { ensureReciprocalShareRequest } from "@/lib/domain/sharing";
import { evmClient, fsContracts } from "@/lib/evm";
import { processTransaction } from "@/lib/indexer/process";
import { respond } from "@/lib/utils/respond";
import { tryCatch } from "@/lib/utils/tryCatch";

const { shareApprovals, shareRequests, userInvites } = db.schema;
const { FSManager } = fsContracts;

export default new Hono()
	.get("/received", authenticated, async (ctx) => {
		const userWallet = ctx.var.userWallet;

		const result = await tryCatch(
			db
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
				.orderBy(desc(shareRequests.createdAt)),
		);

		if (result.error) {
			console.error("Error fetching received share requests", result.error);
			return respond.err(ctx, "Failed to retrieve received requests", 500);
		}

		return respond.ok(
			ctx,
			{ requests: result.data },
			"Received requests retrieved",
			200,
		);
	})
	.get("/sent", authenticated, async (ctx) => {
		const userWallet = ctx.var.userWallet;

		const result = await tryCatch(
			db
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
				.orderBy(desc(shareRequests.createdAt)),
		);

		if (result.error) {
			console.error("Error fetching sent share requests", result.error);
			return respond.err(ctx, "Failed to retrieve sent requests", 500);
		}

		return respond.ok(
			ctx,
			{ requests: result.data },
			"Sent requests retrieved",
			200,
		);
	})
	.get("/email-invites", authenticated, async (ctx) => {
		const userWallet = ctx.var.userWallet;

		const result = await tryCatch(
			db
				.select({
					id: userInvites.id,
					inviteeEmail: userInvites.inviteeEmail,
					message: userInvites.message,
					accepted: userInvites.accepted,
					createdAt: userInvites.createdAt,
				})
				.from(userInvites)
				.where(eq(userInvites.sender, userWallet))
				.orderBy(desc(userInvites.createdAt)),
		);

		if (result.error) {
			console.error("Error fetching email invites", result.error);
			return respond.err(ctx, "Failed to retrieve email invites", 500);
		}

		return respond.ok(
			ctx,
			{ invites: result.data },
			"Email invites retrieved",
			200,
		);
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
		return respond.err(
			ctx,
			"Share requests are accepted on-chain only. Sign ApproveSender and POST /sharing/approve (see FSManager / apps/contracts/README.md).",
			400,
		);
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
				establishMutualConnection: z.boolean().optional(),
				shareRequestId: z.uuid().optional(),
			})
			.safeParse(rawBody);

		if (parsedBody.error) {
			return respond.err(ctx, parsedBody.error.message, 400);
		}

		const {
			sender,
			nonce,
			deadline,
			signature,
			establishMutualConnection,
			shareRequestId,
		} = parsedBody.data;

		const senderAddr = getAddress(sender);

		if (establishMutualConnection && shareRequestId) {
			const [matchingRequest] = await db
				.select()
				.from(shareRequests)
				.where(eq(shareRequests.id, shareRequestId));

			if (
				!matchingRequest ||
				getAddress(matchingRequest.senderWallet) !== senderAddr ||
				getAddress(matchingRequest.recipientWallet) !== recipient ||
				matchingRequest.status !== "PENDING"
			) {
				return respond.err(
					ctx,
					"shareRequestId does not match a pending incoming request for this approval",
					400,
				);
			}
		}

		const args = [recipient, senderAddr, nonce, deadline, signature] as const;

		const sim = await tryCatch(
			FSManager.simulate.approveSender(args, {
				account: evmClient.account.address,
			}),
		);
		if (sim.error) {
			return respond.err(ctx, "Invalid signature", 400);
		}

		const txHash = await FSManager.write.approveSender(args);
		await processTransaction(txHash, {});

		let reciprocalCreated = false;
		if (establishMutualConnection) {
			const out = await ensureReciprocalShareRequest({
				approverWallet: recipient,
				counterpartyWallet: senderAddr,
			});
			reciprocalCreated = out.created;
		}

		return respond.ok(
			ctx,
			{ txHash, reciprocalCreated },
			"Sender approved",
			201,
		);
	})
	.get("/receivable-from", authenticated, async (ctx) => {
		const userWallet = ctx.var.userWallet;

		const subquery = db
			.select({
				senderWallet: shareApprovals.senderWallet,
				maxCreatedAt: sql<Date>`max(${shareApprovals.createdAt})`.as(
					"maxCreatedAt",
				),
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
				maxCreatedAt: sql<Date>`max(${shareApprovals.createdAt})`.as(
					"maxCreatedAt",
				),
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
