import { useSearch } from "@tanstack/react-router";

export type SignDocumentMode =
	| { mode: "warm"; pieceCid: string }
	| { mode: "cold"; pieceCid: string; inviteToken: string }
	| { mode: "invalid"; reason: "cold_missing_piece" };

export function useSignDocumentMode(): SignDocumentMode {
	const search = useSearch({ from: "/dashboard/document/sign/" });
	const invite = search.invite?.trim() ?? "";
	const pieceCid = search.pieceCid?.trim() ?? "";
	if (invite) {
		if (!pieceCid) return { mode: "invalid", reason: "cold_missing_piece" };
		return { mode: "cold", pieceCid, inviteToken: invite };
	}
	return { mode: "warm", pieceCid };
}
