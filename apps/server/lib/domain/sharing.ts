import { and, desc, eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/db";

const { shareApprovals, shareRequests, userInvites } = db.schema;

/** Pending email invites → share requests when the user registers with that email. */
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

/** Optional reciprocal share request after an on-chain approval (mutual trust). */
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
