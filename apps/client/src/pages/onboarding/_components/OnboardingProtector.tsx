import { useIsRegistered } from "@filosign/react/hooks";
import { usePrivy } from "@privy-io/react-auth";
import { Navigate, useRouterState } from "@tanstack/react-router";
import {
	coldInviteEntrySearchSchema,
	toSignDocumentSearch,
} from "@/src/lib/routing/cold-invite-search";

export default function OnboardingProtector({
	children,
	allowRegistered = false,
}: {
	children: React.ReactNode;
	allowRegistered?: boolean;
}) {
	const { ready } = usePrivy();
	const isRegistered = useIsRegistered();
	const coldSignSearch = useRouterState({
		select: (s) => {
			const p = coldInviteEntrySearchSchema.safeParse(s.location.search);
			return p.success ? toSignDocumentSearch(p.data) : null;
		},
	});

	if (!allowRegistered && ready && isRegistered.data) {
		if (coldSignSearch) {
			return (
				<Navigate
					to="/dashboard/document/sign"
					search={coldSignSearch}
					replace
				/>
			);
		}
		return <Navigate to="/dashboard" replace />;
	}

	return <>{children}</>;
}
