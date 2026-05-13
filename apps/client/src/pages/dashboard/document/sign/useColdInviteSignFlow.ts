import { encryption, KEM, toBytes, toHex } from "@filosign/crypto-utils";
import { useFilosignContext } from "@filosign/react";
import {
	fetchUserProfile,
	LOGIN_PIN_REQUIRED,
	useClaimColdInvite,
	useColdInviteDecrypt,
	useColdInvitePayload,
	useIsLoggedIn,
	useIsRegistered,
	useLogin,
	useLogout,
	useUserProfile,
	type ViewFileResult,
} from "@filosign/react/hooks";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getAddress, type Hex } from "viem";
import { useStorePersist } from "@/src/lib/hooks/use-store";
import { coldInviteRecipientMatchesIdentity } from "@/src/lib/routing/cold-invite-search";
import { executeSwitchAccountLogout } from "@/src/pages/onboarding/_components/OnboardingSwitchAccountLink";

export function useColdInviteSignFlow(args: {
	pieceCid: string;
	inviteToken: string;
}) {
	const { pieceCid, inviteToken } = args;
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { api, wallet } = useFilosignContext();
	const { ready, authenticated, login, logout: logoutPrivy, user } = usePrivy();
	const { data: userProfile } = useUserProfile();
	const sdkLogin = useLogin();
	const logoutFilosign = useLogout();
	const clearOnboardingForm = useStorePersist((s) => s.clearOnboardingForm);
	const isRegistered = useIsRegistered();
	const isLoggedIn = useIsLoggedIn();
	const { data: invite, isLoading, error } = useColdInvitePayload(inviteToken);
	const coldDecrypt = useColdInviteDecrypt();
	const claimColdInvite = useClaimColdInvite();

	const [phrase, setPhrase] = useState("");
	const [pin, setPin] = useState("");
	const [fileData, setFileData] = useState<ViewFileResult | null>(null);
	const [decryptError, setDecryptError] = useState<string | null>(null);
	const [tryingWalletUnlock, setTryingWalletUnlock] = useState(false);
	const [showPinAuth, setShowPinAuth] = useState(false);
	const walletUnlockStartedRef = useRef(false);
	const autoPrivyLoginRef = useRef(false);

	const resetColdInviteWizardAfterSwitchAccount = useCallback(() => {
		setPhrase("");
		setPin("");
		setDecryptError(null);
		setTryingWalletUnlock(false);
		setShowPinAuth(false);
		walletUnlockStartedRef.current = false;
		autoPrivyLoginRef.current = false;
	}, []);

	useEffect(() => {
		if (!invite || authenticated || autoPrivyLoginRef.current) return;
		autoPrivyLoginRef.current = true;
		void login();
	}, [invite, authenticated, login]);

	const runColdInviteSwitchAccount = useCallback(async () => {
		await executeSwitchAccountLogout({
			clearOnboardingForm,
			wallet,
			logoutFilosign,
			logoutPrivy,
			navigate,
			stayAfterLogout: true,
			onStayAfterLogout: resetColdInviteWizardAfterSwitchAccount,
		});
	}, [
		clearOnboardingForm,
		wallet,
		logoutFilosign,
		logoutPrivy,
		navigate,
		resetColdInviteWizardAfterSwitchAccount,
	]);

	const phraseWordCount = useMemo(() => {
		const normalized = phrase
			.trim()
			.toLowerCase()
			.replace(/[\s_]+/g, "-")
			.replace(/-+/g, "-");
		return normalized.split("-").filter(Boolean).length;
	}, [phrase]);

	const loggedInEmail = useMemo(
		() => user?.email?.address?.trim() || user?.google?.email?.trim() || "",
		[user?.email?.address, user?.google?.email],
	);

	const inviteMatchesCurrentUser = useMemo(() => {
		if (!invite) return false;
		return coldInviteRecipientMatchesIdentity({
			recipientEmails: invite.recipientEmails,
			loggedInEmail,
			profileEmail: userProfile?.email,
			senderWallet: wallet?.account?.address,
			inviteSender: invite.sender,
		});
	}, [invite, loggedInEmail, userProfile?.email, wallet?.account?.address]);

	const signedInEmailForUi = loggedInEmail || userProfile?.email?.trim() || "";

	const shouldSwitchAccountPrompt =
		(invite?.recipientEmails.length ?? 0) > 0 &&
		authenticated &&
		!fileData &&
		!inviteMatchesCurrentUser;

	useEffect(() => {
		if (!authenticated || !invite || fileData) return;
		if (isRegistered.isPending) return;
		if (isRegistered.data === false) {
			navigate({
				to: "/onboarding",
				search: {
					coldPieceCid: pieceCid,
					coldInvite: inviteToken,
				},
				replace: true,
			} as never);
		}
	}, [
		authenticated,
		invite,
		fileData,
		isRegistered.data,
		isRegistered.isPending,
		pieceCid,
		inviteToken,
		navigate,
	]);

	useEffect(() => {
		if (!ready || !authenticated) return;
		if (!isRegistered.data || isRegistered.isPending) return;
		if (isLoggedIn.data) {
			setShowPinAuth(false);
			setPin("");
			walletUnlockStartedRef.current = false;
			return;
		}
		if (isLoggedIn.isPending) return;
		if (showPinAuth) return;

		const canTryWallet =
			authenticated &&
			isRegistered.data &&
			!isRegistered.isPending &&
			!isLoggedIn.data &&
			!isLoggedIn.isPending;

		if (!canTryWallet) {
			walletUnlockStartedRef.current = false;
			return;
		}

		if (walletUnlockStartedRef.current) return;
		walletUnlockStartedRef.current = true;
		setTryingWalletUnlock(true);

		void sdkLogin
			.mutateAsync({})
			.catch((err: unknown) => {
				if (err instanceof Error && err.message === LOGIN_PIN_REQUIRED) {
					setShowPinAuth(true);
					walletUnlockStartedRef.current = false;
					return;
				}
				toast.error(
					err instanceof Error ? err.message : "Could not unlock session",
				);
				setShowPinAuth(true);
				walletUnlockStartedRef.current = false;
			})
			.finally(() => {
				setTryingWalletUnlock(false);
			});
	}, [
		ready,
		authenticated,
		isRegistered.data,
		isRegistered.isPending,
		isLoggedIn.data,
		isLoggedIn.isPending,
		sdkLogin,
		showPinAuth,
	]);

	const wizardPanel = useMemo(() => {
		if (!invite) return null;
		if (!authenticated) return "signingIn" as const;
		if (isRegistered.isPending || isLoggedIn.isPending) return "busy" as const;
		if (isRegistered.data === false) return "redirecting" as const;
		if (!isLoggedIn.data && showPinAuth) return "pin" as const;
		if (!isLoggedIn.data && tryingWalletUnlock) return "unlocking" as const;
		if (!isLoggedIn.data) return "busy" as const;
		return "passphrase" as const;
	}, [
		invite,
		authenticated,
		isRegistered.isPending,
		isRegistered.data,
		isLoggedIn.isPending,
		isLoggedIn.data,
		showPinAuth,
		tryingWalletUnlock,
	]);

	const claimWithWalletWrap = useCallback(
		async (dek: Uint8Array, recipientEncryptionPk: Hex) => {
			if (!wallet?.account?.address) {
				throw new Error("Missing recipient wallet");
			}

			const recipientWallet = getAddress(wallet.account.address);
			const { ciphertext: kemCiphertext, sharedSecret } = await KEM.encapsulate(
				{
					publicKeyOther: toBytes(recipientEncryptionPk),
				},
			);
			const encryptedEncryptionKey = await encryption.encrypt({
				message: dek,
				secretKey: sharedSecret,
				info: `${pieceCid}:${recipientWallet}`,
			});

			await claimColdInvite.mutateAsync({
				inviteToken,
				kemCiphertext: toHex(kemCiphertext),
				encryptedEncryptionKey: toHex(encryptedEncryptionKey),
			});
		},
		[wallet?.account?.address, pieceCid, claimColdInvite, inviteToken],
	);

	const resolveRecipientEncryptionKey = useCallback(async (): Promise<Hex> => {
		await queryClient.refetchQueries({
			predicate: (q) =>
				Array.isArray(q.queryKey) && q.queryKey[0] === "fsQ-authed-api",
		});
		if (!api.jwtExists) {
			throw new Error(
				"Could not authenticate with the server. Try unlocking your session again.",
			);
		}
		api.ensureJwt();
		const profile = await fetchUserProfile(api);
		if (!profile.encryptionPublicKey?.trim()) {
			throw new Error("Missing recipient encryption key");
		}
		return profile.encryptionPublicKey as Hex;
	}, [api, queryClient]);

	const ensureLoggedInForUnlock = useCallback(async () => {
		if (!authenticated) {
			await login();
			throw new Error("PRIVY_LOGIN_STARTED");
		}
		if (isRegistered.data === false) {
			throw new Error("REDIRECTING_TO_ONBOARDING");
		}
		if (!isLoggedIn.data) {
			throw new Error(
				"Wait for your wallet session to finish unlocking, or enter your PIN if prompted.",
			);
		}
	}, [authenticated, login, isRegistered.data, isLoggedIn.data]);

	const submitFilosignPin = useCallback(async () => {
		if (pin.length < 6 || pin.length > 10) return;
		setDecryptError(null);
		try {
			await sdkLogin.mutateAsync({ pin });
			await queryClient.invalidateQueries({
				queryKey: ["fsQ-is-logged-in", wallet?.account.address],
			});
			await queryClient.refetchQueries({
				predicate: (q) =>
					Array.isArray(q.queryKey) && q.queryKey[0] === "fsQ-is-logged-in",
			});
			setShowPinAuth(false);
			setPin("");
			toast.success("Session unlocked");
		} catch (e) {
			const msg =
				e instanceof Error ? e.message : "Could not unlock with this PIN";
			setDecryptError(msg);
			toast.error(msg);
		}
	}, [pin, sdkLogin, queryClient, wallet?.account.address]);

	const handleUnlockDocument = useCallback(async () => {
		if (!invite || !phrase.trim()) {
			toast.error("Enter the six-word passphrase the sender shared with you.");
			return;
		}
		if (wizardPanel !== "passphrase") {
			toast.error("Finish signing in before unlocking the document.");
			return;
		}
		if (shouldSwitchAccountPrompt) {
			toast.error(
				"Only the invited email can open this document. Switch account or sign in with that address.",
			);
			return;
		}

		setDecryptError(null);
		try {
			await ensureLoggedInForUnlock();

			const recipientEncryptionPk = await resolveRecipientEncryptionKey();

			const result = await coldDecrypt.mutateAsync({
				phrase: phrase
					.trim()
					.toLowerCase()
					.replace(/[\s_]+/g, "-")
					.replace(/-+/g, "-"),
				wrappedEncryptionKey: invite.wrappedEncryptionKey as Hex,
				downloadUrl: invite.downloadUrl,
			});

			await claimWithWalletWrap(result.encryptionKey, recipientEncryptionPk);
			setFileData(result);

			void queryClient.invalidateQueries({ queryKey: ["user"] });
			toast.success("Document unlocked and secured to your wallet");
		} catch (e) {
			if (e instanceof Error && e.message === "PRIVY_LOGIN_STARTED") return;
			if (e instanceof Error && e.message === "REDIRECTING_TO_ONBOARDING")
				return;
			const msg =
				e instanceof Error ? e.message : "Could not unlock this document";
			setDecryptError(msg);
			toast.error(msg || "Invalid passphrase or corrupted document");
		}
	}, [
		invite,
		phrase,
		wizardPanel,
		shouldSwitchAccountPrompt,
		ensureLoggedInForUnlock,
		resolveRecipientEncryptionKey,
		coldDecrypt.mutateAsync,
		claimWithWalletWrap,
		queryClient,
	]);

	const previewPdfBytes = useMemo(() => {
		if (!fileData) return null;
		const mime = fileData.metadata.mimeType;
		const name = fileData.metadata.name?.toLowerCase() ?? "";
		const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
		if (!isPdf) return null;
		return new Uint8Array(fileData.fileBytes);
	}, [fileData]);

	return {
		ready,
		isLoading,
		error,
		invite,
		fileData,
		user,
		wizardPanel,
		phrase,
		setPhrase,
		pin,
		setPin,
		decryptError,
		phraseWordCount,
		shouldSwitchAccountPrompt,
		signedInEmailForUi,
		inviteMatchesCurrentUser,
		submitFilosignPin,
		handleUnlockDocument,
		runColdInviteSwitchAccount,
		resetColdInviteWizardAfterSwitchAccount,
		previewPdfBytes,
		sdkLogin,
		coldDecrypt,
		claimColdInvite,
	};
}
