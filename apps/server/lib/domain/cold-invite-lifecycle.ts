import { and, eq, gt, sql } from "drizzle-orm";
import type { Address } from "viem";
import db from "@/lib/db";
import { fileColdInvites } from "@/lib/db/schema/file";

/** Active cold invite: pending and not past expiry. */
export function pendingColdInviteFilter(now = new Date()) {
	return and(
		eq(fileColdInvites.status, "pending"),
		gt(fileColdInvites.expiresAt, now),
	);
}

export async function expirePendingColdInvites(): Promise<{
	expiredCount: number;
	expiredRows: { id: string; filePieceCid: string }[];
}> {
	const now = new Date();
	const updated = await db
		.update(fileColdInvites)
		.set({
			status: "expired",
			updatedAt: now,
		})
		.where(
			and(
				eq(fileColdInvites.status, "pending"),
				sql`${fileColdInvites.expiresAt} < ${now}`,
			),
		)
		.returning({
			id: fileColdInvites.id,
			filePieceCid: fileColdInvites.filePieceCid,
		});

	return { expiredCount: updated.length, expiredRows: updated };
}

export function redactColdInviteRow(claimedByWallet: Address) {
	return {
		status: "claimed" as const,
		claimedAt: new Date(),
		claimedByWallet,
		inviteToken: null,
		wrappedEncryptionKey: null,
		updatedAt: new Date(),
	};
}
