import { z } from "zod";

export const coldInviteEntrySearchSchema = z.object({
	coldPieceCid: z.string().optional().default(""),
	coldInvite: z.string().optional().default(""),
});

export type ColdInviteEntrySearch = z.infer<typeof coldInviteEntrySearchSchema>;

export function hasColdReturn(search: ColdInviteEntrySearch): boolean {
	const c = search.coldPieceCid?.trim();
	const i = search.coldInvite?.trim();
	return Boolean(c && i);
}

export type SignDocumentColdSearch = { pieceCid: string; invite: string };

export function toSignDocumentSearch(
	search: ColdInviteEntrySearch,
): SignDocumentColdSearch | null {
	const pieceCid = search.coldPieceCid?.trim() ?? "";
	const invite = search.coldInvite?.trim() ?? "";
	if (!pieceCid || !invite) return null;
	return { pieceCid, invite };
}

export function buildColdInviteMagicLink(
	origin: string,
	args: { pieceCid: string; inviteToken: string },
): string {
	const u = new URL("/", origin);
	u.searchParams.set("coldPieceCid", args.pieceCid);
	u.searchParams.set("coldInvite", args.inviteToken);
	return u.toString();
}
