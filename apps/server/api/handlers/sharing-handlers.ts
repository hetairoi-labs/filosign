import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress, isAddress } from "viem";
import z from "zod";
import db from "@/lib/db";
import { ensureReciprocalShareRequest } from "@/lib/domain/sharing";
import { sendInviteEmail, sendShareRequestEmail } from "@/lib/email/invites";
import { evmClient, fsContracts } from "@/lib/evm";
import { processTransaction } from "@/lib/indexer/process";
import { tryCatch } from "@/lib/utils/tryCatch";

const REQUEST_SPAM_BASE_HOURS = 3;

const { shareApprovals, shareRequests, userInvites, users } = db.schema;
const { FSManager } = fsContracts;

/** --- inbox (share requests & approvals UX) --- */

export async function sharingReceivedRequests(wallet: Address) {
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
			.where(eq(shareRequests.recipientWallet, wallet))
			.orderBy(desc(shareRequests.createdAt)),
	);

	if (result.error) {
		console.error("Error fetching received share requests", result.error);
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to retrieve received requests",
		});
	}
	return { requests: result.data };
}

export async function sharingSentRequests(wallet: Address) {
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
			.where(eq(shareRequests.senderWallet, wallet))
			.orderBy(desc(shareRequests.createdAt)),
	);

	if (result.error) {
		console.error("Error fetching sent share requests", result.error);
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to retrieve sent requests",
		});
	}
	return { requests: result.data };
}

export async function sharingEmailInvites(wallet: Address) {
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
			.where(eq(userInvites.sender, wallet))
			.orderBy(desc(userInvites.createdAt)),
	);

	if (result.error) {
		console.error("Error fetching email invites", result.error);
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to retrieve email invites",
		});
	}
	return { invites: result.data };
}

export async function sharingCanSendTo(sender: Address, recipient: string) {
	if (!recipient || !isAddress(recipient)) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid recipient" });
	}
	const recipientAddr = getAddress(recipient);
	if (recipientAddr === sender) {
		return { canSend: false, reason: "Cannot send to yourself" as const };
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
	return {
		canSend,
		reason: canSend ? null : ("No active approval" as const),
	};
}

export async function sharingCancelRequest(wallet: Address, id: string) {
	const [approval] = await db
		.select()
		.from(shareRequests)
		.where(
			and(
				eq(shareRequests.id, id),
				eq(shareRequests.senderWallet, wallet),
				eq(shareRequests.status, "PENDING"),
			),
		);
	if (!approval) {
		throw new ORPCError("NOT_FOUND", {
			message: "Approval not found or cannot cancel",
		});
	}
	await db
		.update(shareRequests)
		.set({ status: "CANCELLED" })
		.where(eq(shareRequests.id, id));
	return {};
}

export async function sharingRejectRequest(wallet: Address, id: string) {
	const [approval] = await db
		.select()
		.from(shareRequests)
		.where(
			and(
				eq(shareRequests.id, id),
				eq(shareRequests.recipientWallet, wallet),
				eq(shareRequests.status, "PENDING"),
			),
		);
	if (!approval) {
		throw new ORPCError("NOT_FOUND", {
			message: "Request not found or cannot reject",
		});
	}
	await db
		.update(shareRequests)
		.set({ status: "REJECTED" })
		.where(eq(shareRequests.id, id));
	return {};
}

export function sharingAcceptRequestDenied(): never {
	throw new ORPCError("BAD_REQUEST", {
		message:
			"Share requests are accepted on-chain only. Sign ApproveSender and POST sharing.approve (see FSManager / apps/contracts/README.md).",
	});
}

const zApproveBody = z.object({
	sender: zEvmAddress(),
	nonce: z.coerce.bigint(),
	deadline: z.coerce.bigint(),
	signature: zHexString(),
	establishMutualConnection: z.boolean().optional(),
	shareRequestId: z.uuid().optional(),
});

export async function sharingApprove(wallet: Address, body: unknown) {
	const recipient = wallet;
	const parsedBody = zApproveBody.safeParse(body ?? {});

	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsedBody.error.message });
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
			throw new ORPCError("BAD_REQUEST", {
				message:
					"shareRequestId does not match a pending incoming request for this approval",
			});
		}
	}

	const args = [recipient, senderAddr, nonce, deadline, signature] as const;

	const sim = await tryCatch(
		FSManager.simulate.approveSender(args, {
			account: evmClient.account.address,
		}),
	);
	if (sim.error) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid signature" });
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

	return { txHash, reciprocalCreated };
}

export async function sharingReceivableFrom(wallet: Address) {
	const subquery = db
		.select({
			senderWallet: shareApprovals.senderWallet,
			maxCreatedAt: sql<Date>`max(${shareApprovals.createdAt})`.as(
				"maxCreatedAt",
			),
		})
		.from(shareApprovals)
		.where(eq(shareApprovals.recipientWallet, wallet))
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

	return { approvals };
}

export async function sharingSendableTo(wallet: Address) {
	const subquery = db
		.select({
			recipientWallet: shareApprovals.recipientWallet,
			maxCreatedAt: sql<Date>`max(${shareApprovals.createdAt})`.as(
				"maxCreatedAt",
			),
		})
		.from(shareApprovals)
		.where(eq(shareApprovals.senderWallet, wallet))
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

	return { approvals };
}

/** --- email invite by id (public read) --- */

export async function sharingInviteById(id: string) {
	if (!id) {
		throw new ORPCError("BAD_REQUEST", { message: "Invite ID is required" });
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
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to retrieve invite",
		});
	}

	const data = result.data;
	if (data.notFound) {
		throw new ORPCError("NOT_FOUND", {
			message: "Invite not found or expired",
		});
	}

	const { invite, sender } = data;
	return {
		id: invite.id,
		inviteeEmail: invite.inviteeEmail,
		message: invite.message,
		createdAt: invite.createdAt,
		senderName: sender
			? `${sender.firstName || ""} ${sender.lastName || ""}`.trim() ||
				`${sender.walletAddress.slice(0, 6)}...${sender.walletAddress.slice(-4)}`
			: `${invite.sender.slice(0, 6)}...${invite.sender.slice(-4)}`,
	};
}

export async function sharingInviteClaim(wallet: Address, id: string) {
	if (!id) {
		throw new ORPCError("BAD_REQUEST", { message: "Invite ID is required" });
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
					recipientWallet: wallet,
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
		throw new ORPCError("BAD_REQUEST", {
			message:
				result.error instanceof Error
					? result.error.message
					: "Invite claim failed",
		});
	}

	return result.data;
}

/** --- outbound share requests --- */

const zCreateRequestBody = z.object({
	recipientWallet: zEvmAddress(),
	recipientEmail: z.email().optional(),
	message: z.string().max(500).nullable().optional(),
});

export async function sharingCreateRequest(wallet: Address, body: unknown) {
	const parsedBody = zCreateRequestBody.safeParse(body);

	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsedBody.error.message });
	}

	const { recipientWallet, recipientEmail, message } = parsedBody.data;
	const recipient = getAddress(recipientWallet);
	const sender = wallet;

	if (recipient === sender) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Don't ask yourself for permission",
		});
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
		throw new ORPCError("CONFLICT", {
			message: "A pending request already exists",
		});
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
		throw new ORPCError("CONFLICT", { message: "Already approved" });
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
			throw new ORPCError("TOO_MANY_REQUESTS", {
				message: `Please wait ${remainingHours} more hours before sending another request (spam prevention)`,
			});
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

	return {
		...newRequest,
		emailSent,
		emailError,
	};
}

export async function sharingRequestInvite(wallet: Address, body: unknown) {
	const parsed = z
		.object({
			inviteeEmail: z.string(),
			message: z.string().max(500).nullable().optional(),
		})
		.safeParse(body);

	const inviteeEmail =
		parsed.success && parsed.data.inviteeEmail
			? String(parsed.data.inviteeEmail).trim()
			: "";
	const message = parsed.success ? parsed.data.message : undefined;

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!inviteeEmail || !emailRegex.test(inviteeEmail)) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Please provide a valid email address",
		});
	}

	if (
		message !== undefined &&
		message !== null &&
		(typeof message !== "string" || message.length > 500)
	) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Message too long (max 500 characters)",
		});
	}

	const [self] = await db
		.select({
			firstName: users.firstName,
			lastName: users.lastName,
		})
		.from(users)
		.where(eq(users.walletAddress, wallet));

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
					eq(shareRequests.senderWallet, wallet),
					eq(shareRequests.recipientWallet, existingUser.walletAddress),
					eq(shareRequests.status, "PENDING"),
				),
			);

		if (existingRequest) {
			return { exists: true as const, alreadyRequested: true as const };
		}

		const [latestApproval] = await db
			.select()
			.from(shareApprovals)
			.where(
				and(
					eq(shareApprovals.senderWallet, wallet),
					eq(shareApprovals.recipientWallet, existingUser.walletAddress),
				),
			)
			.orderBy(desc(shareApprovals.createdAt))
			.limit(1);

		if (latestApproval?.active) {
			return { exists: true as const, alreadyApproved: true as const };
		}

		await db.insert(shareRequests).values({
			senderWallet: wallet,
			recipientWallet: existingUser.walletAddress,
			message: message ?? null,
		});

		await tryCatch(
			sendShareRequestEmail({
				to: inviteeEmail,
				senderWallet: wallet,
				recipientWallet: existingUser.walletAddress,
				senderName: self?.firstName
					? `${self.firstName} ${self.lastName || ""}`.trim()
					: undefined,
				message: message ?? null,
			}),
		);

		return { exists: true as const, requested: true as const };
	}

	const [existingInvite] = await db
		.select({ id: userInvites.id })
		.from(userInvites)
		.where(
			and(
				eq(userInvites.sender, wallet),
				eq(userInvites.inviteeEmail, inviteeEmail),
			),
		);

	if (existingInvite) {
		return { invited: true as const, alreadyInvited: true as const };
	}

	const [newInvite] = await db
		.insert(userInvites)
		.values({
			sender: wallet,
			inviteeEmail,
			message: message ?? null,
		})
		.returning();

	const inviteEmailRes = await tryCatch(
		sendInviteEmail({
			to: inviteeEmail,
			senderWallet: wallet,
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

	return { invited: true as const };
}
