import { and, desc, eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/db";

const { shareApprovals, shareRequests, userInvites } = db.schema;

/**
 * When someone joins with an email that matches pending email invites,
 * convert those invites into received share requests (same behavior as
 * POST /sharing/invite/:id/claim). Trust is still established via
 * recipient-signed `approveSender` on FSManager (see apps/contracts/README.md).
 */
export async function materializePendingInvitesForEmail(args: {
	walletAddress: Address;
	email: string;
}): Promise<void> {
	const normalized = args.email.trim().toLowerCase();
	if (!normalized) return;

	await db.transaction(async (tx) => {
		const invites = await tx
			.select()
			.from(userInvites)
			.where(sql`lower(${userInvites.inviteeEmail}) = ${normalized}`);

		for (const invite of invites) {
			await tx.insert(shareRequests).values({
				senderWallet: invite.sender,
				recipientWallet: args.walletAddress,
				message:
					invite.message ??
					`Auto-generated request from invite to ${invite.inviteeEmail}`,
				createdAt: invite.createdAt,
			});
			await tx.delete(userInvites).where(eq(userInvites.id, invite.id));
		}
	});
}

/**
 * After recipient B approves sender A (so A can send to B), create a pending
 * share request from B → A so A can approve B for mutual exchange.
 * FSManager stores directional `approvedSenders[recipient][sender]`; mutual
 * sending requires both directions (see FSManager.approveSender).
 */
export async function ensureReciprocalShareRequest(args: {
	approverWallet: Address;
	counterpartyWallet: Address;
}): Promise<{ created: boolean }> {
	const B = getAddress(args.approverWallet);
	const A = getAddress(args.counterpartyWallet);

	if (B === A) {
		return { created: false };
	}

	const [reverseApproval] = await db
		.select()
		.from(shareApprovals)
		.where(
			and(
				eq(shareApprovals.senderWallet, B),
				eq(shareApprovals.recipientWallet, A),
			),
		)
		.orderBy(desc(shareApprovals.createdAt))
		.limit(1);

	if (reverseApproval?.active) {
		return { created: false };
	}

	const [pendingReverse] = await db
		.select({ id: shareRequests.id })
		.from(shareRequests)
		.where(
			and(
				eq(shareRequests.senderWallet, B),
				eq(shareRequests.recipientWallet, A),
				eq(shareRequests.status, "PENDING"),
			),
		)
		.limit(1);

	if (pendingReverse) {
		return { created: false };
	}

	await db.insert(shareRequests).values({
		senderWallet: B,
		recipientWallet: A,
		message: "Complete mutual sharing",
	});

	return { created: true };
}
