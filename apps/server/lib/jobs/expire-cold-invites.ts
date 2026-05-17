import { SERVER_ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track";
import { expirePendingColdInvites } from "@/lib/domain/cold-invite-lifecycle";

/** Mark pending cold invites past expiry as expired; PostHog event per row. */
export async function runExpireColdInvitesJob(): Promise<{
	expiredCount: number;
}> {
	const { expiredCount, expiredRows } = await expirePendingColdInvites();

	for (const row of expiredRows) {
		trackServerEvent({
			distinctId: "system",
			event: SERVER_ANALYTICS_EVENTS.coldInviteExpired,
			pieceCid: row.filePieceCid,
			properties: { invite_id: row.id },
		});
	}

	return { expiredCount };
}
