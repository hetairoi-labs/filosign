import { zEvmAddress } from "@filosign/shared/zod";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { authenticated } from "@/api/middleware/auth";
import db from "@/lib/db";
import { sendInviteEmail, sendShareRequestEmail } from "@/lib/email/invites";
import { respond } from "@/lib/utils/respond";
import { tryCatch } from "@/lib/utils/tryCatch";

const REQUEST_SPAM_BASE_HOURS = 3;

const { shareApprovals, shareRequests, userInvites, users } = db.schema;

export default new Hono()
	.post("/request", authenticated, async (ctx) => {
		const rawBody = await ctx.req.json();
		const parsedBody = z
			.object({
				recipientWallet: zEvmAddress(),
				recipientEmail: z.email().optional(),
				message: z.string().max(500).nullable().optional(),
			})
			.safeParse(rawBody);

		if (parsedBody.error) {
			return respond.err(ctx, parsedBody.error.message, 400);
		}

		const { recipientWallet, recipientEmail, message } = parsedBody.data;
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

		let emailSent = false;
		let emailError: string | undefined;

		{
			const [self] = await db
				.select()
				.from(users)
				.where(eq(users.walletAddress, sender));
			const senderName =
				[self?.firstName, self?.lastName].filter(Boolean).join(" ") ||
				self?.username ||
				self?.email ||
				undefined;

			const emailToNotify = recipientEmail
				? recipientEmail
				: ((
						await db
							.select({ email: users.email })
							.from(users)
							.where(eq(users.walletAddress, recipient))
					)[0]?.email ?? undefined);

			if (emailToNotify) {
				const emailRes = await tryCatch(
					sendShareRequestEmail({
						to: emailToNotify,
						senderWallet: sender as Address,
						recipientWallet: recipient as Address,
						senderName,
						message: message || null,
					}),
				);
				if (!emailRes.error) {
					emailSent = true;
				} else {
					emailError =
						emailRes.error instanceof Error
							? emailRes.error.message
							: "Failed to send notification";
					console.error("Failed to send share request email", emailRes.error);
				}
			}
		}

		return respond.ok(
			ctx,
			{ ...newRequest, emailSent, emailError },
			"Share request created",
			201,
		);
	})
	.post("/request/invite", authenticated, async (ctx) => {
		const { inviteeEmail, message } = await ctx.req.json();

		if (
			!inviteeEmail ||
			typeof inviteeEmail !== "string" ||
			!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteeEmail)
		) {
			return respond.err(ctx, "Please provide a valid email address", 400);
		}

		if (message && (typeof message !== "string" || message.length > 500)) {
			return respond.err(ctx, "Message too long (max 500 characters)", 400);
		}

		const [self] = await db
			.select({
				firstName: users.firstName,
				lastName: users.lastName,
			})
			.from(users)
			.where(eq(users.walletAddress, ctx.var.userWallet));

		const [existingUser] = await db
			.select({ walletAddress: users.walletAddress })
			.from(users)
			.where(eq(users.email, inviteeEmail));

		if (existingUser) {
			const [existingRequest] = await db
				.select()
				.from(shareRequests)
				.where(
					and(
						eq(shareRequests.senderWallet, ctx.var.userWallet),
						eq(shareRequests.recipientWallet, existingUser.walletAddress),
						eq(shareRequests.status, "PENDING"),
					),
				);

			if (existingRequest) {
				return respond.ok(
					ctx,
					{ exists: true, alreadyRequested: true },
					"Request already sent",
					200,
				);
			}

			const [latestApproval] = await db
				.select()
				.from(shareApprovals)
				.where(
					and(
						eq(shareApprovals.senderWallet, ctx.var.userWallet),
						eq(shareApprovals.recipientWallet, existingUser.walletAddress),
					),
				)
				.orderBy(desc(shareApprovals.createdAt))
				.limit(1);

			if (latestApproval?.active) {
				return respond.ok(
					ctx,
					{ exists: true, alreadyApproved: true },
					"Already connected",
					200,
				);
			}

			await db.insert(shareRequests).values({
				senderWallet: ctx.var.userWallet,
				recipientWallet: existingUser.walletAddress,
				message: message ?? null,
			});

			await tryCatch(
				sendShareRequestEmail({
					to: inviteeEmail,
					senderWallet: ctx.var.userWallet,
					recipientWallet: existingUser.walletAddress,
					senderName: self?.firstName
						? `${self.firstName} ${self.lastName || ""}`.trim()
						: undefined,
					message: message ?? null,
				}),
			);

			return respond.ok(
				ctx,
				{ exists: true, requested: true },
				"Request sent",
				201,
			);
		}

		const [existingInvite] = await db
			.select({ id: userInvites.id })
			.from(userInvites)
			.where(
				and(
					eq(userInvites.sender, ctx.var.userWallet),
					eq(userInvites.inviteeEmail, inviteeEmail),
				),
			);

		if (existingInvite) {
			return respond.ok(
				ctx,
				{ invited: true, alreadyInvited: true },
				"Already invited",
				200,
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

		const inviteEmailRes = await tryCatch(
			sendInviteEmail({
				to: inviteeEmail,
				senderWallet: ctx.var.userWallet,
				senderName: self?.firstName
					? `${self.firstName} ${self.lastName || ""}`.trim()
					: undefined,
				message: message ?? null,
				inviteId: newInvite.id,
			}),
		);
		if (inviteEmailRes.error) {
			console.error("Failed to send invite email:", inviteEmailRes.error);
		}

		return respond.ok(ctx, { invited: true }, "Invite sent", 201);
	});
