import { normalizeColdInvitePhrase } from "@filosign/crypto-utils";
import { useFilosignContext } from "@filosign/react";
import {
	LOGIN_RECOVERY_PHRASE_REQUIRED,
	useIsLoggedIn,
	useIsRegistered,
	useLogin,
	useLogout,
	useRecoverWithPhrase,
} from "@filosign/react/auth";
import {
	useClaimColdInvite,
	useColdInviteDecrypt,
	useColdInvitePayload,
	type ViewFileResult,
} from "@filosign/react/files";
import { fetchUserProfile, useUserProfile } from "@filosign/react/users";
import { buildClaimKemPayload } from "@filosign/react/utils";
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
	const { rpc, session, wallet } = useFilosignContext();
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
	const recoverWithPhrase = useRecoverWithPhrase();

	const [phrase, setPhrase] = useState("");
	const [filosignRecoveryPhrase, setFilosignRecoveryPhrase] = useState("");
	const [fileData, setFileData] = useState<ViewFileResult | null>(null);
	const [decryptError, setDecryptError] = useState<string | null>(null);
	const [tryingWalletUnlock, setTryingWalletUnlock] = useState(false);
	const [showFilosignRecovery, setShowFilosignRecovery] = useState(false);
	const walletUnlockStartedRef = useRef(false);
	const autoPrivyLoginRef = useRef(false);

	const resetColdInviteWizardAfterSwitchAccount = useCallback(() => {
		setPhrase("");
		setFilosignRecoveryPhrase("");
		setDecryptError(null);
		setTryingWalletUnlock(false);
		setShowFilosignRecovery(false);
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

	const phraseNormalized = useMemo(
		() => normalizeColdInvitePhrase(phrase),
		[phrase],
	);

	const phraseWordCount = useMemo(() => {
		return phraseNormalized.split("-").filter(Boolean).length;
	}, [phraseNormalized]);

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
			setShowFilosignRecovery(false);
			setFilosignRecoveryPhrase("");
			walletUnlockStartedRef.current = false;
			return;
		}
		if (isLoggedIn.isPending) return;
		if (showFilosignRecovery) return;

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
				if (
					err instanceof Error &&
					err.message === LOGIN_RECOVERY_PHRASE_REQUIRED
				) {
					setShowFilosignRecovery(true);
					walletUnlockStartedRef.current = false;
					return;
				}
				toast.error(
					err instanceof Error ? err.message : "Could not unlock session",
				);
				setShowFilosignRecovery(true);
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
		showFilosignRecovery,
	]);

	const wizardPanel = useMemo(() => {
		if (!invite) return null;
		if (!authenticated) return "signingIn" as const;
		if (isRegistered.isPending || isLoggedIn.isPending) return "busy" as const;
		if (isRegistered.data === false) return "redirecting" as const;
		if (!isLoggedIn.data && showFilosignRecovery)
			return "filosignRecovery" as const;
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
		showFilosignRecovery,
		tryingWalletUnlock,
	]);

	const claimWithWalletWrap = useCallback(
		async (dek: Uint8Array, recipientEncryptionPk: Hex) => {
			if (!wallet?.account?.address) {
				throw new Error("Missing recipient wallet");
			}

			const recipientWallet = getAddress(wallet.account.address);
			const { kemCiphertext, encryptedEncryptionKey } =
				await buildClaimKemPayload({
					dek,
					recipientEncryptionPk,
					pieceCid,
					recipientWalletAddress: recipientWallet,
				});

			await claimColdInvite.mutateAsync({
				inviteToken,
				kemCiphertext,
				encryptedEncryptionKey,
			});
		},
		[wallet?.account?.address, pieceCid, claimColdInvite, inviteToken],
	);

	const resolveRecipientEncryptionKey = useCallback(async (): Promise<Hex> => {
		await queryClient.refetchQueries({
			predicate: (q) =>
				Array.isArray(q.queryKey) && q.queryKey[0] === "fsQ-authed-api",
		});
		if (!session.jwtExists) {
			throw new Error(
				"Could not authenticate with the server. Try unlocking your session again.",
			);
		}
		session.ensureJwt();
		const profile = await fetchUserProfile(rpc);
		if (!profile.encryptionPublicKey?.trim()) {
			throw new Error("Missing recipient encryption key");
		}
		return profile.encryptionPublicKey as Hex;
	}, [rpc, session, queryClient]);

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
				"Wait for your wallet session to finish unlocking, or enter your recovery phrase if prompted.",
			);
		}
	}, [authenticated, login, isRegistered.data, isLoggedIn.data]);

	const submitFilosignRecovery = useCallback(async () => {
		if (!filosignRecoveryPhrase.trim()) return;
		setDecryptError(null);
		try {
			await recoverWithPhrase.mutateAsync({
				phrase: filosignRecoveryPhrase,
			});
			await queryClient.invalidateQueries({
				queryKey: ["fsQ-is-logged-in", wallet?.account.address],
			});
			await queryClient.refetchQueries({
				predicate: (q) =>
					Array.isArray(q.queryKey) && q.queryKey[0] === "fsQ-is-logged-in",
			});
			setShowFilosignRecovery(false);
			setFilosignRecoveryPhrase("");
			toast.success("Session unlocked");
		} catch (e) {
			const msg =
				e instanceof Error
					? e.message.includes("unlock") || e.message.includes("phrase")
						? "Invalid recovery phrase"
						: e.message
					: "Could not unlock with this phrase";
			setDecryptError(msg);
			toast.error(msg);
		}
	}, [
		filosignRecoveryPhrase,
		recoverWithPhrase,
		queryClient,
		wallet?.account.address,
	]);

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

		const normalizedPhrase = normalizeColdInvitePhrase(phrase);
		const wc = normalizedPhrase.split("-").filter(Boolean).length;
		if (wc !== 6) {
			toast.error(
				`Passphrase must be exactly six hyphen-separated words (${wc} detected).`,
			);
			return;
		}

		setDecryptError(null);
		try {
			await ensureLoggedInForUnlock();

			const recipientEncryptionPk = await resolveRecipientEncryptionKey();

			const result = await coldDecrypt.mutateAsync({
				phrase: normalizedPhrase,
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
		pieceCid,
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
		filosignRecoveryPhrase,
		setFilosignRecoveryPhrase,
		decryptError,
		phraseWordCount,
		shouldSwitchAccountPrompt,
		signedInEmailForUi,
		inviteMatchesCurrentUser,
		submitFilosignRecovery,
		isFilosignRecoveryPending: recoverWithPhrase.isPending,
		handleUnlockDocument,
		runColdInviteSwitchAccount,
		resetColdInviteWizardAfterSwitchAccount,
		previewPdfBytes,
		sdkLogin,
		coldDecrypt,
		claimColdInvite,
	};
}
