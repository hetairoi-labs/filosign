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
	type ViewFileResult,
} from "@filosign/react/hooks";
import {
	ArrowLeftIcon,
	FileTextIcon,
	SpinnerIcon,
} from "@phosphor-icons/react";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { getAddress, type Hex } from "viem";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { useStorePersist } from "@/src/lib/hooks/use-store";
import { cn } from "@/src/lib/utils";
import {
	executeSwitchAccountLogout,
	OnboardingSwitchAccountLink,
} from "@/src/pages/onboarding/_components/OnboardingSwitchAccountLink";

const LazyPdfJsPreview = lazy(
	() => import("@/src/lib/components/custom/PdfJsPreview.lazy"),
);

type Props = {
	pieceCid: string;
	inviteToken: string;
};

function normalizePassphrase(input: string): string {
	return input
		.trim()
		.toLowerCase()
		.replace(/[\s_]+/g, "-")
		.replace(/-+/g, "-");
}

function normalizeEmail(input: string | null | undefined): string {
	return input?.trim().toLowerCase() ?? "";
}

export function ColdInviteSignDocument({ pieceCid, inviteToken }: Props) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { api, wallet } = useFilosignContext();
	const { ready, authenticated, login, logout: logoutPrivy, user } = usePrivy();
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
		const normalized = normalizePassphrase(phrase);
		return normalized.split("-").filter(Boolean).length;
	}, [phrase]);

	const activePrivyEmail = normalizeEmail(user?.email?.address);
	const recipientEmailsSet = useMemo(
		() =>
			new Set(
				(invite?.recipientEmails ?? [])
					.map((e) => normalizeEmail(e))
					.filter(Boolean),
			),
		[invite?.recipientEmails],
	);
	const shouldSwitchAccountPrompt =
		recipientEmailsSet.size > 0 &&
		authenticated &&
		!!activePrivyEmail &&
		!fileData &&
		!recipientEmailsSet.has(activePrivyEmail);

	/** New Filosign accounts: finish registration + PIN on onboarding, then return here. */
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

	/** Same pattern as DashboardProtector: wallet-based unlock first; PIN only if required. */
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
				"This invite is for a different email. Switch account to continue.",
			);
			return;
		}

		setDecryptError(null);
		try {
			await ensureLoggedInForUnlock();

			const recipientEncryptionPk = await resolveRecipientEncryptionKey();

			const result = await coldDecrypt.mutateAsync({
				phrase: normalizePassphrase(phrase),
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

	if (!ready) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4">
				<InlineLoader size="lg" />
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4">
				<InlineLoader size="lg" />
				<p className="text-sm text-muted-foreground">Loading invite…</p>
			</div>
		);
	}

	if (error || !invite) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
				<FileTextIcon className="size-14 text-muted-foreground" />
				<h1 className="text-lg font-semibold">Invite not found</h1>
				<p className="text-sm text-muted-foreground text-center max-w-md">
					This link may be invalid or expired. Ask the sender for a new invite.
				</p>
				<Button variant="outline" onClick={() => navigate({ to: "/" })}>
					<ArrowLeftIcon className="size-4 mr-2" />
					Home
				</Button>
			</div>
		);
	}

	if (!fileData) {
		return (
			<>
				<div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/20 px-4 py-12">
					<FileTextIcon className="size-12 text-muted-foreground" />
					<div className="text-center space-y-1 max-w-md">
						<h1 className="text-lg font-semibold">
							You have a document to sign
						</h1>
						<p className="text-sm text-muted-foreground">
							When your session is ready, enter the six-word passphrase the
							sender gave you out-of-band.
						</p>
						<p className="text-xs font-mono text-muted-foreground truncate pt-2">
							{pieceCid}
						</p>
					</div>
				</div>

				<Dialog open>
					<DialogContent className="sm:max-w-md" showCloseButton={false}>
						{wizardPanel === "signingIn" ||
						wizardPanel === "busy" ||
						wizardPanel === "redirecting" ||
						wizardPanel === "unlocking" ? (
							<>
								<DialogHeader>
									<DialogTitle>
										{wizardPanel === "signingIn"
											? "Signing you in…"
											: wizardPanel === "redirecting"
												? "Setting up your account"
												: wizardPanel === "unlocking"
													? "Unlocking with your wallet"
													: "One moment"}
									</DialogTitle>
									<DialogDescription>
										{wizardPanel === "signingIn"
											? "Continue in the window if prompted."
											: wizardPanel === "redirecting"
												? "Taking you to registration…"
												: wizardPanel === "unlocking"
													? "Confirm in your wallet if prompted. You only need a PIN if automatic unlock fails."
													: "Loading your session…"}
									</DialogDescription>
								</DialogHeader>
								<div className="flex justify-center py-6">
									<InlineLoader size="md" />
								</div>
							</>
						) : wizardPanel === "pin" ? (
							<>
								<DialogHeader>
									<DialogTitle>PIN required</DialogTitle>
									<DialogDescription>
										Your wallet couldn’t unlock the session automatically. Enter
										your Filosign PIN (the same as on the dashboard).
									</DialogDescription>
								</DialogHeader>
								<div className="space-y-2">
									<Label htmlFor="cold-invite-pin-session">Filosign PIN</Label>
									<Input
										id="cold-invite-pin-session"
										type="password"
										inputMode="numeric"
										autoComplete="off"
										value={pin}
										onChange={(e) => setPin(e.target.value.replace(/\D+/g, ""))}
										placeholder="6-10 digits"
										className="font-mono text-sm"
										onKeyDown={(e) => {
											if (e.key === "Enter") void submitFilosignPin();
										}}
									/>
								</div>
								{decryptError && (
									<p className="text-sm text-destructive">{decryptError}</p>
								)}
								<Button
									type="button"
									variant="primary"
									className="w-full"
									disabled={sdkLogin.isPending || pin.length < 6}
									onClick={() => void submitFilosignPin()}
								>
									{sdkLogin.isPending ? (
										<>
											<SpinnerIcon className="size-4 animate-spin mr-2" />
											Unlocking…
										</>
									) : (
										"Continue"
									)}
								</Button>
							</>
						) : (
							<>
								<DialogHeader>
									<DialogTitle>Enter passphrase</DialogTitle>
									<DialogDescription className="text-left">
										Six hyphenated words sent to{" "}
										<span className="font-medium text-foreground">
											{invite.recipientEmails.join(", ")}
										</span>
										. Enter them exactly as given (words separated by hyphens).
									</DialogDescription>
								</DialogHeader>
								<div className="space-y-2">
									<Label htmlFor="cold-invite-phrase">
										Six-word passphrase
									</Label>
									<Input
										id="cold-invite-phrase"
										type="text"
										autoComplete="off"
										spellCheck={false}
										value={phrase}
										onChange={(e) => setPhrase(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") void handleUnlockDocument();
										}}
										placeholder="e.g. abandon-ability-able-about-above-absent"
										className="font-mono text-sm"
									/>
								</div>
								{decryptError && (
									<p className="text-sm text-destructive">{decryptError}</p>
								)}
								<Button
									type="button"
									variant="primary"
									className="w-full"
									disabled={
										coldDecrypt.isPending ||
										claimColdInvite.isPending ||
										sdkLogin.isPending ||
										phraseWordCount !== 6
									}
									onClick={() => void handleUnlockDocument()}
								>
									{coldDecrypt.isPending || claimColdInvite.isPending ? (
										<>
											<SpinnerIcon className="size-4 animate-spin mr-2" />
											{coldDecrypt.isPending
												? "Unlocking…"
												: "Securing for your wallet…"}
										</>
									) : (
										"Unlock document"
									)}
								</Button>
								<p className="text-xs text-muted-foreground text-center">
									From{" "}
									<span className="text-foreground">{invite.senderLabel}</span>
								</p>
								<OnboardingSwitchAccountLink
									className="border-t border-border mt-4 pt-4"
									stayAfterLogout
									onStayAfterLogout={resetColdInviteWizardAfterSwitchAccount}
								/>
							</>
						)}
					</DialogContent>
				</Dialog>

				<Dialog open={shouldSwitchAccountPrompt}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Switch account to continue</DialogTitle>
							<DialogDescription>
								This invite is restricted to{" "}
								<strong>{invite?.recipientEmails.join(", ")}</strong>, but you
								are signed in as{" "}
								<strong>
									{user?.email?.address ?? "an account without email"}
								</strong>
								.
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => navigate({ to: "/" })}
							>
								Cancel
							</Button>
							<Button
								type="button"
								variant="primary"
								onClick={() => void runColdInviteSwitchAccount()}
							>
								Switch account
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</>
		);
	}

	return (
		<div className="fixed inset-0 bg-background flex flex-col">
			<div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between gap-3">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => navigate({ to: "/dashboard" })}
				>
					<ArrowLeftIcon className="size-4 mr-2" />
					Back
				</Button>
				<span className="text-xs font-mono text-muted-foreground truncate max-w-[50%]">
					{pieceCid}
				</span>
			</div>
			<div className="flex-1 overflow-auto flex items-start justify-center p-6 bg-muted/20">
				{previewPdfBytes ? (
					<div
						className={cn(
							"relative bg-white border shadow-lg border-border",
							"w-[min(100%,600px)] h-[min(85vh,800px)]",
						)}
					>
						<Suspense
							fallback={
								<div className="flex min-h-[320px] items-center justify-center">
									<InlineLoader size="md" />
								</div>
							}
						>
							<LazyPdfJsPreview
								className="absolute inset-0"
								documentKey={pieceCid}
								file={previewPdfBytes}
								pageNumber={1}
								width={600}
								maxHeight={800}
							/>
						</Suspense>
					</div>
				) : (
					<div className="text-sm text-muted-foreground max-w-lg text-center">
						Preview is only available for PDFs. Use the full Filosign app to
						download other formats once you have access.
					</div>
				)}
			</div>
		</div>
	);
}
