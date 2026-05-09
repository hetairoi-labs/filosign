import { useUpdateUserProfile, useUserProfile } from "@filosign/react/hooks";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useRef } from "react";

export default function ProfileEmailSync() {
	const { authenticated, user } = usePrivy();
	const userProfile = useUserProfile();
	const updateUserProfile = useUpdateUserProfile();
	const syncedEmailRef = useRef<string | null>(null);

	const privyEmail = user?.email?.address || user?.google?.email || null;
	const profileEmail = userProfile.data?.email;

	useEffect(() => {
		if (!authenticated || !privyEmail || !userProfile.data) {
			return;
		}

		const normalizedPrivy = privyEmail.toLowerCase();
		const normalizedProfile = profileEmail?.toLowerCase();

		if (normalizedPrivy === normalizedProfile) {
			syncedEmailRef.current = privyEmail;
			return;
		}

		if (syncedEmailRef.current === privyEmail) {
			return;
		}

		syncedEmailRef.current = privyEmail;
		updateUserProfile.mutate({ email: privyEmail });
	}, [
		authenticated,
		privyEmail,
		profileEmail,
		userProfile.data,
		updateUserProfile,
	]);

	return null;
}
