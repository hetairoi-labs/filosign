import {
	useRecoverWithPhrase,
	useRotatePin,
	useSyncPrivyEmail,
	useUserProfile,
} from "@filosign/react/hooks";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import {
	useIdentityToken,
	useLinkAccount,
	usePrivy,
	useUpdateAccount,
	useUser,
} from "@privy-io/react-auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { ProfileForm } from "../types";
import { profileSchema } from "../types";
import { useFileUpload } from "./use-file-upload";
import { useSectionState } from "./use-section-state";

export function useProfileSettings() {
	const { ready, authenticated, user } = usePrivy();
	const { refreshUser } = useUser();
	const { identityToken } = useIdentityToken();
	const syncPrivyEmail = useSyncPrivyEmail();

	const [pendingBackendEmailSync, setPendingBackendEmailSync] =
		useState(false);

	const syncBackendEmailAfterPrivyChange = useCallback(async () => {
		await refreshUser();
		setPendingBackendEmailSync(true);
	}, [refreshUser]);

	const { updateEmail } = useUpdateAccount({
		onSuccess: async ({ updateMethod }) => {
			if (updateMethod !== "email") return;
			await syncBackendEmailAfterPrivyChange();
		},
	});

	const { linkEmail } = useLinkAccount({
		onSuccess: async ({ linkMethod }) => {
			if (linkMethod !== "email") return;
			await syncBackendEmailAfterPrivyChange();
		},
	});

	useEffect(() => {
		if (!pendingBackendEmailSync || !identityToken) return;
		setPendingBackendEmailSync(false);
		syncPrivyEmail.mutate({ identityToken });
	}, [pendingBackendEmailSync, identityToken, syncPrivyEmail]);

	const hasPrivyEmailLogin =
		Boolean(user?.email) ||
		Boolean(user?.linkedAccounts?.some((a) => a.type === "email"));
	const hasGoogleLogin =
		Boolean(user?.google) ||
		Boolean(
			user?.linkedAccounts?.some((a) => a.type === "google_oauth"),
		);

	const startPrimaryEmailWithPrivy = useCallback(() => {
		if (!ready || !authenticated || !user) return;
		if (hasPrivyEmailLogin) {
			updateEmail();
			return;
		}
		if (hasGoogleLogin) {
			linkEmail();
			return;
		}
	}, [
		authenticated,
		hasGoogleLogin,
		hasPrivyEmailLogin,
		linkEmail,
		ready,
		updateEmail,
		user,
	]);

	const primaryEmailActionDisabled =
		!ready ||
		!authenticated ||
		!user ||
		(!hasPrivyEmailLogin && !hasGoogleLogin);

	const primaryEmailFlowPending =
		pendingBackendEmailSync || syncPrivyEmail.isPending;

	const walletAddress = user?.wallet?.address || "";
	const userProfileQuery = useUserProfile();

	const form = useForm<ProfileForm>({
		resolver: standardSchemaResolver(profileSchema),
		defaultValues: {
			personal: {
				firstName: "",
				lastName: "",
				walletAddress,
				email: "",
			},
			profilePicture: null,
		},
		mode: "onSubmit",
	});

	const baseValues = useMemo(() => {
		const userProfile = userProfileQuery.data as
			| {
					firstName?: string | null;
					lastName?: string | null;
					email?: string | null;
					avatarUrl?: string | null;
			  }
			| undefined;
		return {
			personal: {
				firstName: userProfile?.firstName ?? "",
				lastName: userProfile?.lastName ?? "",
				walletAddress,
				email: userProfile?.email ?? "",
			},
			profilePicture: userProfile?.avatarUrl ?? null,
		};
	}, [userProfileQuery.data, walletAddress]);

	useEffect(() => {
		if (!userProfileQuery.data) return;
		form.reset(baseValues);
	}, [form, baseValues, userProfileQuery.data]);

	const personalSection = useSectionState("personal", form, baseValues);
	const profilePictureSection = useSectionState(
		"profilePicture",
		form,
		baseValues,
	);
	const fileUpload = useFileUpload(form);

	const rotatePin = useRotatePin();
	const recoverWithPhrase = useRecoverWithPhrase();
	const [currentPin, setCurrentPin] = useState("");
	const [newPin, setNewPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [pinMessage, setPinMessage] = useState<string | null>(null);

	const [recoveryPhrase, setRecoveryPhrase] = useState("");
	const [phraseNewPin, setPhraseNewPin] = useState("");
	const [phraseConfirmPin, setPhraseConfirmPin] = useState("");
	const [phraseMessage, setPhraseMessage] = useState<string | null>(null);

	const canRotatePin =
		currentPin.length >= 6 &&
		currentPin.length <= 10 &&
		newPin.length >= 6 &&
		newPin.length <= 10 &&
		newPin === confirmPin;

	const canRecoverWithPhrase =
		recoveryPhrase.trim().length > 0 &&
		phraseNewPin.length >= 6 &&
		phraseNewPin.length <= 10 &&
		phraseNewPin === phraseConfirmPin;

	return {
		form,
		personalSection,
		startPrimaryEmailWithPrivy,
		primaryEmailActionDisabled,
		primaryEmailFlowPending,
		primaryEmailUiMode: hasPrivyEmailLogin
			? ("update" as const)
			: ("link" as const),
		profilePictureSection,
		fileUpload,
		rotatePin,
		recoverWithPhrase,
		currentPin,
		newPin,
		confirmPin,
		pinMessage,
		setCurrentPin,
		setNewPin,
		setConfirmPin,
		setPinMessage,
		canRotatePin,
		recoveryPhrase,
		phraseNewPin,
		phraseConfirmPin,
		phraseMessage,
		setRecoveryPhrase,
		setPhraseNewPin,
		setPhraseConfirmPin,
		setPhraseMessage,
		canRecoverWithPhrase,
	};
}
