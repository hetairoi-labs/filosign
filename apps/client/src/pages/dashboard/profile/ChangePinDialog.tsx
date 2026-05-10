import { useRecoverWithPhrase, useRotatePin } from "@filosign/react/hooks";
import { ArrowLeftIcon, KeyIcon, NotebookIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { Label } from "@/src/lib/components/ui/label";
import { Textarea } from "@/src/lib/components/ui/textarea";
import OtpInput from "@/src/pages/onboarding/_components/OtpInput";

type Step = "menu" | "current-pin" | "recovery";

interface ChangePinDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ChangePinDialog({ open, onOpenChange }: ChangePinDialogProps) {
	const rotatePin = useRotatePin();
	const recoverWithPhrase = useRecoverWithPhrase();

	const [step, setStep] = useState<Step>("menu");
	const [currentPin, setCurrentPin] = useState("");
	const [newPin, setNewPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [pinError, setPinError] = useState<string | null>(null);

	const [recoveryPhrase, setRecoveryPhrase] = useState("");
	const [phraseNewPin, setPhraseNewPin] = useState("");
	const [phraseConfirmPin, setPhraseConfirmPin] = useState("");
	const [phraseError, setPhraseError] = useState<string | null>(null);

	const resetAll = useCallback(() => {
		setStep("menu");
		setCurrentPin("");
		setNewPin("");
		setConfirmPin("");
		setPinError(null);
		setRecoveryPhrase("");
		setPhraseNewPin("");
		setPhraseConfirmPin("");
		setPhraseError(null);
	}, []);

	useEffect(() => {
		if (!open) {
			resetAll();
		}
	}, [open, resetAll]);

	const handleOpenChange = (next: boolean) => {
		onOpenChange(next);
		if (!next) {
			resetAll();
		}
	};

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

	const handleRotatePin = async () => {
		setPinError(null);
		setPhraseError(null);
		try {
			await rotatePin.mutateAsync({ currentPin, newPin });
			toast.success("PIN updated.");
			handleOpenChange(false);
		} catch (error) {
			setPinError(
				error instanceof Error ? error.message : "Could not update PIN.",
			);
		}
	};

	const handleRecoverWithPhrase = async () => {
		setPhraseError(null);
		setPinError(null);
		try {
			await recoverWithPhrase.mutateAsync({
				phrase: recoveryPhrase,
				newPin: phraseNewPin,
			});
			toast.success("PIN updated with your recovery phrase.");
			handleOpenChange(false);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Could not reset PIN";
			const friendly =
				message.toLowerCase().includes("phrase") ||
				message.toLowerCase().includes("unlock")
					? "That phrase doesn’t match this wallet."
					: message;
			setPhraseError(friendly);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				className="gap-0 overflow-hidden p-0 sm:max-w-md"
				showCloseButton
			>
				<div className="border-b border-border/50 bg-muted/20 px-6 py-5">
					<DialogHeader className="gap-1 space-y-0">
						{step !== "menu" ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="-ml-2 mb-2 h-8 w-fit gap-1.5 px-2 text-muted-foreground hover:text-foreground"
								onClick={() => {
									setStep("menu");
									setPinError(null);
									setPhraseError(null);
								}}
							>
								<ArrowLeftIcon className="size-4" weight="bold" />
								Back
							</Button>
						) : null}
						<DialogTitle className="text-base font-medium tracking-tight">
							{step === "menu" && "Change PIN"}
							{step === "current-pin" && "Verify with current PIN"}
							{step === "recovery" && "Use recovery phrase"}
						</DialogTitle>
						<DialogDescription className="text-xs leading-relaxed">
							{step === "menu" &&
								"Pick how you’d like to verify—it only takes a moment."}
							{step === "current-pin" &&
								"Enter your existing PIN, then choose a new one."}
							{step === "recovery" &&
								"The 24 words you saved when you set up this wallet."}
						</DialogDescription>
					</DialogHeader>
				</div>

				<div className="px-6 py-6">
					{step === "menu" ? (
						<div className="flex flex-col gap-2">
							<button
								type="button"
								className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-background px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
								onClick={() => setStep("current-pin")}
							>
								<span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
									<KeyIcon className="size-5" weight="duotone" />
								</span>
								<span className="min-w-0">
									<span className="block text-sm font-medium text-foreground/90">
										I know my current PIN
									</span>
									<span className="mt-0.5 block text-xs text-muted-foreground">
										Fastest if you remember it
									</span>
								</span>
							</button>
							<button
								type="button"
								className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-background px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
								onClick={() => setStep("recovery")}
							>
								<span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
									<NotebookIcon className="size-5" weight="duotone" />
								</span>
								<span className="min-w-0">
									<span className="block text-sm font-medium text-foreground/90">
										I have my recovery phrase
									</span>
									<span className="mt-0.5 block text-xs text-muted-foreground">
										If you forgot your PIN
									</span>
								</span>
							</button>
						</div>
					) : null}

					{step === "current-pin" ? (
						<div className="space-y-6">
							<div className="space-y-3">
								<Label className="text-xs font-normal text-muted-foreground">
									Current PIN
								</Label>
								<OtpInput value={currentPin} onChange={setCurrentPin} />
							</div>
							<div className="space-y-3">
								<Label className="text-xs font-normal text-muted-foreground">
									New PIN
								</Label>
								<OtpInput value={newPin} onChange={setNewPin} />
							</div>
							<div className="space-y-3">
								<Label className="text-xs font-normal text-muted-foreground">
									Confirm new PIN
								</Label>
								<OtpInput value={confirmPin} onChange={setConfirmPin} />
							</div>
							{pinError ? (
								<p className="text-xs text-destructive/90">{pinError}</p>
							) : null}
							<Button
								type="button"
								className="w-full"
								variant="primary"
								disabled={!canRotatePin || rotatePin.isPending}
								onClick={handleRotatePin}
							>
								{rotatePin.isPending ? "Updating…" : "Update PIN"}
							</Button>
						</div>
					) : null}

					{step === "recovery" ? (
						<div className="space-y-6">
							<div className="space-y-2">
								<Label
									htmlFor="change-pin-recovery-phrase"
									className="text-xs font-normal text-muted-foreground"
								>
									Recovery phrase
								</Label>
								<Textarea
									id="change-pin-recovery-phrase"
									value={recoveryPhrase}
									onChange={(e) => setRecoveryPhrase(e.target.value)}
									placeholder="Paste your 24 words"
									rows={4}
									className="min-h-[100px] resize-none border-border/60 bg-muted/10 text-sm"
								/>
							</div>
							<div className="space-y-3">
								<Label className="text-xs font-normal text-muted-foreground">
									New PIN (6–10 digits)
								</Label>
								<OtpInput
									value={phraseNewPin}
									onChange={setPhraseNewPin}
									length={10}
								/>
							</div>
							<div className="space-y-3">
								<Label className="text-xs font-normal text-muted-foreground">
									Confirm new PIN
								</Label>
								<OtpInput
									value={phraseConfirmPin}
									onChange={setPhraseConfirmPin}
									length={10}
								/>
							</div>
							{phraseError ? (
								<p className="text-xs text-destructive/90">{phraseError}</p>
							) : null}
							<Button
								type="button"
								className="w-full"
								variant="primary"
								disabled={
									!canRecoverWithPhrase || recoverWithPhrase.isPending
								}
								onClick={handleRecoverWithPhrase}
							>
								{recoverWithPhrase.isPending ? "Updating…" : "Set new PIN"}
							</Button>
						</div>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}
