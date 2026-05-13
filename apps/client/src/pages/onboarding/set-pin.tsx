import { useLogin, useLogout } from "@filosign/react/hooks";
import {
	CaretRightIcon,
	CopySimpleIcon,
	DownloadSimpleIcon,
} from "@phosphor-icons/react";
import { useIdentityToken } from "@privy-io/react-auth";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import Logo from "@/src/lib/components/custom/Logo";
import { Button } from "@/src/lib/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { useStorePersist } from "@/src/lib/hooks/use-store";
import { handleError } from "@/src/lib/utils";
import OnboardingProtector from "./_components/OnboardingProtector";
import { OnboardingSwitchAccountLink } from "./_components/OnboardingSwitchAccountLink";
import OtpInput from "./_components/OtpInput";

export default function OnboardingSetPinPage() {
	const [pin, setPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);
	const [step, setStep] = useState<"enter" | "confirm">("enter");
	const navigate = useNavigate();
	const search = useSearch({ from: "/onboarding/set-pin" });
	const { onboardingForm, setOnboardingForm: _setOnboardingForm } =
		useStorePersist();

	const coldReturn =
		search.coldPieceCid && search.coldInvite
			? { coldPieceCid: search.coldPieceCid, coldInvite: search.coldInvite }
			: undefined;
	const { identityToken } = useIdentityToken();

	const logout = useLogout();
	const login = useLogin();

	const handleRegistrationComplete = async () => {
		if (!onboardingForm) return;

		try {
			navigate({
				to: "/onboarding/welcome",
				...(coldReturn ? { search: coldReturn } : {}),
			});
		} catch (error) {
			handleError(error, async () => {
				await logout.mutateAsync();
			});
		}
	};

	const handlePinSubmit = () => {
		if (step === "enter" && pin.length >= 6 && pin.length <= 10) {
			setStep("confirm");
			setConfirmPin("");
		}
	};

	const handleCreateAccount = async () => {
		if (login.isPending) return;

		if (!identityToken) {
			toast.error(
				"Identity token not available. Enable identity tokens in the Privy dashboard, or try logging in again.",
			);
			return;
		}

		void login.mutateAsync({ pin, idToken: identityToken }).then((result) => {
			if (result?.recoveryPhrase) {
				setRecoveryPhrase(result.recoveryPhrase);
				return;
			}
			void handleRegistrationComplete();
		});
	};

	const handleBack = () => {
		if (step === "confirm") {
			setStep("enter");
			setConfirmPin("");
		} else {
			navigate({
				to: "/onboarding",
				...(coldReturn ? { search: coldReturn } : {}),
			} as never);
		}
	};

	const currentPin = step === "enter" ? pin : confirmPin;
	const isComplete = currentPin.length >= 6 && currentPin.length <= 10;
	const pinsMatch =
		step === "confirm" &&
		pin === confirmPin &&
		pin.length >= 6 &&
		pin.length <= 10 &&
		isComplete;
	const isPinMismatch =
		step === "confirm" && confirmPin.length >= 6 && pin !== confirmPin;

	const handleCopyRecoveryPhrase = async () => {
		if (!recoveryPhrase) return;
		try {
			await navigator.clipboard.writeText(recoveryPhrase);
			toast.success("Recovery phrase copied");
		} catch {
			toast.error("Unable to copy recovery phrase");
		}
	};

	const handleDownloadRecoveryPhrase = () => {
		if (!recoveryPhrase) return;
		const fileName = `filosign-recovery-phrase-${Date.now()}.txt`;
		const content = `Filosign Recovery Phrase\n\n${recoveryPhrase}\n`;
		const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = fileName;
		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();
		URL.revokeObjectURL(url);
		toast.success("Recovery phrase downloaded");
	};

	return (
		<OnboardingProtector allowRegistered>
			<div className="flex justify-center items-center min-h-screen bg-background">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3, delay: 0.2 }}
					className="flex flex-col justify-center items-center px-8 mx-auto"
				>
					<Logo
						className="mb-4"
						textClassName="text-foreground font-semibold"
					/>
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3, delay: 0.2 }}
						className="flex flex-col justify-center items-center mx-auto w-full"
					>
						<Card className="w-full">
							<CardHeader>
								<CardTitle>
									{step === "enter" ? "Setup your PIN" : "Confirm PIN"}
								</CardTitle>
								<CardDescription>
									{step === "enter"
										? "Choose a 6-10 digit PIN for your account"
										: "Re-enter your PIN to confirm"}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex flex-col gap-2">
									<OtpInput
										value={currentPin}
										onChange={
											step === "enter"
												? (value) => setPin(value)
												: (value) => setConfirmPin(value)
										}
										length={10}
										autoFocus={true}
										onSubmit={() => {
											if (pinsMatch) {
												handleCreateAccount();
												return;
											}
											handlePinSubmit();
										}}
									/>
								</div>

								{isPinMismatch && (
									<p className="text-destructive text-sm text-center">
										PIN does not match.
									</p>
								)}

								<div className="flex gap-3">
									<Button
										variant="ghost"
										onClick={handleBack}
										className="flex-1"
									>
										Back
									</Button>

									{pinsMatch ? (
										<Button
											onClick={handleCreateAccount}
											disabled={login.isPending}
											className="flex-1 group"
											variant="primary"
										>
											{login.isPending ? "Registering..." : "Create account"}
											<CaretRightIcon
												className="transition-transform duration-200 size-4 group-hover:translate-x-1"
												weight="bold"
											/>
										</Button>
									) : (
										<Button
											onClick={handlePinSubmit}
											disabled={!isComplete || step === "confirm"}
											className="flex-1 group"
											variant="primary"
										>
											{step === "enter" ? "Continue" : "Confirm PIN"}
											<CaretRightIcon
												className="transition-transform duration-200 size-4 group-hover:translate-x-1"
												weight="bold"
											/>
										</Button>
									)}
								</div>
							</CardContent>
						</Card>
						<OnboardingSwitchAccountLink />
					</motion.div>
				</motion.div>
			</div>
			<Dialog open={!!recoveryPhrase}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Save your recovery phrase</DialogTitle>
						<DialogDescription>
							This 24-word phrase is shown only once. If you lose it and forget
							your PIN, your account cannot be recovered.
						</DialogDescription>
					</DialogHeader>
					<div className="flex items-center justify-end gap-2">
						<Button
							variant="outline"
							size="icon"
							onClick={handleCopyRecoveryPhrase}
							aria-label="Copy recovery phrase"
							title="Copy recovery phrase"
						>
							<CopySimpleIcon className="size-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={handleDownloadRecoveryPhrase}
							aria-label="Download recovery phrase as text file"
							title="Download recovery phrase as text file"
						>
							<DownloadSimpleIcon className="size-4" />
						</Button>
					</div>
					<div className="rounded-md border bg-muted p-3 text-sm leading-6">
						{recoveryPhrase}
					</div>
					<DialogFooter className="flex-col gap-2 sm:flex-col">
						<Button
							onClick={() => {
								setRecoveryPhrase(null);
								void handleRegistrationComplete();
							}}
							variant="primary"
							className="w-full"
						>
							I saved it
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</OnboardingProtector>
	);
}
