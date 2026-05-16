import { useSyncPrivyEmail, useUserProfile } from "@filosign/react/users";
import { useIdentityToken, usePrivy } from "@privy-io/react-auth";
import { useEffect, useRef } from "react";

/** Syncs email from a verified Privy identity JWT on each new Privy identity token (e.g. login). */
export default function ProfileEmailSync() {
	const { authenticated } = usePrivy();
	const { identityToken } = useIdentityToken();
	const userProfile = useUserProfile();
	const syncPrivyEmail = useSyncPrivyEmail();
	const lastSyncedTokenRef = useRef<string | null>(null);

	useEffect(() => {
		if (!authenticated || !identityToken || !userProfile.data) {
			return;
		}

		if (lastSyncedTokenRef.current === identityToken) {
			return;
		}

		lastSyncedTokenRef.current = identityToken;
		syncPrivyEmail.mutate({ identityToken });
	}, [authenticated, identityToken, userProfile.data, syncPrivyEmail]);

	return null;
}
