import {
	ArrowLeftIcon,
	FileTextIcon,
	SpinnerIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { CopyButton } from "@/src/lib/components/custom/CopyButton";
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
import { cn } from "@/src/lib/utils";
import { OnboardingSwitchAccountLink } from "@/src/pages/onboarding/_components/OnboardingSwitchAccountLink";
import { SignDocumentPdfPreview } from "./_components/SignDocumentPdfPreview";
import { SignDocumentShell } from "./_components/SignDocumentShell";
import { useColdInviteSignFlow } from "./useColdInviteSignFlow";

type Props = {
	pieceCid: string;
	inviteToken: string;
};

function ColdStickyHeader({
	pieceCid,
	onBack,
}: {
	pieceCid: string;
	onBack: () => void;
}) {
	return (
		<div className="flex items-center justify-between px-3 py-2 md:px-6 md:py-3 gap-3">
			<Button
				variant="ghost"
				size="sm"
				onClick={onBack}
				className="text-muted-foreground hover:text-foreground hover:bg-accent/50 -ml-2 shrink-0"
			>
				<ArrowLeftIcon className="size-4 mr-1.5" />
				<span className="text-sm">Back</span>
			</Button>
			<h2 className="text-sm flex items-center gap-1 font-semibold truncate text-foreground min-w-0">
				<span className="truncate">{pieceCid}</span>
				<CopyButton text={pieceCid} />
			</h2>
		</div>
	);
}

export function ColdInviteSignDocument({ pieceCid, inviteToken }: Props) {
	const navigate = useNavigate();
	const f = useColdInviteSignFlow({ pieceCid, inviteToken });

	const toDashboard = () => navigate({ to: "/dashboard" });
	const toHome = () => navigate({ to: "/" });

	if (!f.ready) {
		return (
			<SignDocumentShell
				stickyHeader={
					<ColdStickyHeader pieceCid={pieceCid} onBack={toDashboard} />
				}
				body={
					<div className="flex-1 flex items-center justify-center bg-background">
						<InlineLoader size="lg" />
					</div>
				}
			/>
		);
	}

	if (f.isLoading) {
		return (
			<SignDocumentShell
				stickyHeader={
					<ColdStickyHeader pieceCid={pieceCid} onBack={toDashboard} />
				}
				body={
					<div className="flex-1 flex flex-col items-center justify-center gap-3 bg-background px-4">
						<InlineLoader size="lg" />
						<p className="text-sm text-muted-foreground">Loading invite…</p>
					</div>
				}
			/>
		);
	}

	if (f.error || !f.invite) {
		return (
			<SignDocumentShell
				stickyHeader={<ColdStickyHeader pieceCid={pieceCid} onBack={toHome} />}
				body={
					<div className="flex-1 flex flex-col items-center justify-center gap-4 bg-background px-4">
						<FileTextIcon className="size-14 text-muted-foreground" />
						<h1 className="text-lg font-semibold">Invite not found</h1>
						<p className="text-sm text-muted-foreground text-center max-w-md">
							This link may be invalid or expired. Ask the sender for a new
							invite.
						</p>
						<Button variant="outline" onClick={toHome}>
							<ArrowLeftIcon className="size-4 mr-2" />
							Home
						</Button>
					</div>
				}
			/>
		);
	}

	const invite = f.invite;

	if (!f.fileData) {
		return (
			<SignDocumentShell
				stickyHeader={
					<ColdStickyHeader pieceCid={pieceCid} onBack={toDashboard} />
				}
				body={
					<>
						<div className="flex-1 h-full overflow-auto flex flex-col items-center justify-center p-6 bg-background">
							<FileTextIcon className="size-12 text-muted-foreground mb-3" />
							<div className="text-center space-y-1 max-w-md">
								<h1 className="text-lg font-semibold">
									You have a document to sign
								</h1>
								<p className="text-sm text-muted-foreground">
									When your session is ready, enter the six-word passphrase the
									sender gave you out-of-band.
								</p>
							</div>
						</div>
						<aside className="hidden lg:flex w-72 shrink-0 border-l border-border bg-background flex-col overflow-y-auto">
							<div className="p-4 space-y-3 border-b border-border">
								<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									Invite
								</h3>
								<p className="text-sm text-foreground">{invite.senderLabel}</p>
								<p className="text-xs text-muted-foreground">
									Recipients: {invite.recipientEmails.join(", ")}
								</p>
							</div>
							<div className="p-4 text-xs text-muted-foreground">
								Use the dialog to sign in and enter your passphrase.
							</div>
						</aside>
					</>
				}
			>
				<Dialog open>
					<DialogContent className="sm:max-w-md" showCloseButton={false}>
						{f.wizardPanel === "signingIn" ||
						f.wizardPanel === "busy" ||
						f.wizardPanel === "redirecting" ||
						f.wizardPanel === "unlocking" ? (
							<>
								<DialogHeader>
									<DialogTitle>
										{f.wizardPanel === "signingIn"
											? "Signing you in…"
											: f.wizardPanel === "redirecting"
												? "Setting up your account"
												: f.wizardPanel === "unlocking"
													? "Unlocking with your wallet"
													: "One moment"}
									</DialogTitle>
									<DialogDescription>
										{f.wizardPanel === "signingIn"
											? "Continue in the window if prompted."
											: f.wizardPanel === "redirecting"
												? "Taking you to registration…"
												: f.wizardPanel === "unlocking"
													? "Confirm in your wallet if prompted. You only need a PIN if automatic unlock fails."
													: "Loading your session…"}
									</DialogDescription>
								</DialogHeader>
								<div className="flex justify-center py-6">
									<InlineLoader size="md" />
								</div>
							</>
						) : f.wizardPanel === "pin" ? (
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
										value={f.pin}
										onChange={(e) =>
											f.setPin(e.target.value.replace(/\D+/g, ""))
										}
										placeholder="6-10 digits"
										className="font-mono text-sm"
										onKeyDown={(e) => {
											if (e.key === "Enter") void f.submitFilosignPin();
										}}
									/>
								</div>
								{f.decryptError && (
									<p className="text-sm text-destructive">{f.decryptError}</p>
								)}
								<Button
									type="button"
									variant="primary"
									className="w-full"
									disabled={f.sdkLogin.isPending || f.pin.length < 6}
									onClick={() => void f.submitFilosignPin()}
								>
									{f.sdkLogin.isPending ? (
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
										value={f.phrase}
										onChange={(e) => f.setPhrase(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") void f.handleUnlockDocument();
										}}
										placeholder="e.g. abandon-ability-able-about-above-absent"
										className="font-mono text-sm"
									/>
								</div>
								{f.decryptError && (
									<p className="text-sm text-destructive">{f.decryptError}</p>
								)}
								<Button
									type="button"
									variant="primary"
									className="w-full"
									disabled={
										f.coldDecrypt.isPending ||
										f.claimColdInvite.isPending ||
										f.sdkLogin.isPending ||
										f.phraseWordCount !== 6
									}
									onClick={() => void f.handleUnlockDocument()}
								>
									{f.coldDecrypt.isPending || f.claimColdInvite.isPending ? (
										<>
											<SpinnerIcon className="size-4 animate-spin mr-2" />
											{f.coldDecrypt.isPending
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
									onStayAfterLogout={f.resetColdInviteWizardAfterSwitchAccount}
								/>
							</>
						)}
					</DialogContent>
				</Dialog>

				<Dialog open={f.shouldSwitchAccountPrompt}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Switch account to continue</DialogTitle>
							<DialogDescription>
								This invite is restricted to{" "}
								<strong>{invite.recipientEmails.join(", ")}</strong>, but you
								are signed in as{" "}
								<strong>
									{f.user?.email?.address ?? "an account without email"}
								</strong>
								.
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={toHome}>
								Cancel
							</Button>
							<Button
								type="button"
								variant="primary"
								onClick={() => void f.runColdInviteSwitchAccount()}
							>
								Switch account
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</SignDocumentShell>
		);
	}

	return (
		<SignDocumentShell
			stickyHeader={
				<ColdStickyHeader pieceCid={pieceCid} onBack={toDashboard} />
			}
			body={
				<>
					<div className="flex-1 h-full overflow-auto flex items-start justify-center p-6 bg-muted/20">
						{f.previewPdfBytes ? (
							<div
								className={cn(
									"relative bg-white border shadow-lg border-border",
									"w-[min(100%,600px)] h-[min(85vh,800px)]",
								)}
							>
								<SignDocumentPdfPreview
									documentKey={pieceCid}
									file={f.previewPdfBytes}
									pageNumber={1}
									width={600}
									maxHeight={800}
									className="absolute inset-0"
								/>
							</div>
						) : (
							<div className="text-sm text-muted-foreground max-w-lg text-center">
								Preview is only available for PDFs. Use the full Filosign app to
								download other formats once you have access.
							</div>
						)}
					</div>
					<aside className="hidden lg:flex w-72 shrink-0 border-l border-border bg-background flex-col overflow-y-auto p-4">
						<h3 className="font-semibold text-sm">Document unlocked</h3>
						<p className="text-xs text-muted-foreground mt-2">
							From {invite.senderLabel}
						</p>
					</aside>
				</>
			}
		/>
	);
}
