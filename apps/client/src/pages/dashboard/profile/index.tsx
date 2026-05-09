import { CaretLeftIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import Logo from "@/src/lib/components/custom/Logo";
import { Button } from "@/src/lib/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";
import { Form } from "@/src/lib/components/ui/form";
import { Label } from "@/src/lib/components/ui/label";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/src/lib/components/ui/tabs";
import { Textarea } from "@/src/lib/components/ui/textarea";
import { cn } from "@/src/lib/utils/index";
import OtpInput from "@/src/pages/onboarding/_components/OtpInput";
import { useProfileSettings } from "./hooks/use-profile-settings";
import { PersonalInfoSection } from "./PersonalInfoSection";

export default function ProfilePage() {
	const {
		form,
		personalSection,
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
	} = useProfileSettings();

	const handleRotatePin = async () => {
		setPinMessage(null);
		setPhraseMessage(null);
		try {
			await rotatePin.mutateAsync({ currentPin, newPin });
			setCurrentPin("");
			setNewPin("");
			setConfirmPin("");
			setPinMessage("PIN updated successfully.");
		} catch (error) {
			setPinMessage(
				error instanceof Error ? error.message : "Unable to unlock",
			);
		}
	};

	const handleRecoverWithPhrase = async () => {
		setPhraseMessage(null);
		setPinMessage(null);
		try {
			await recoverWithPhrase.mutateAsync({
				phrase: recoveryPhrase,
				newPin: phraseNewPin,
			});
			setRecoveryPhrase("");
			setPhraseNewPin("");
			setPhraseConfirmPin("");
			setPhraseMessage("PIN updated using your recovery phrase.");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unable to reset PIN";
			const friendly =
				message.toLowerCase().includes("phrase") ||
				message.toLowerCase().includes("unlock")
					? "Invalid recovery phrase or it does not match this wallet."
					: message;
			setPhraseMessage(friendly);
		}
	};

	return (
		<div className="min-h-screen">
			{/* Header */}
			<header className="flex sticky top-0 z-50 justify-between items-center px-8 h-16 border-b glass bg-background/50 border-border">
				<div className="flex gap-4 items-center">
					<Logo
						className="px-0"
						textClassName="text-foreground font-bold"
						iconOnly
					/>
					<motion.h3
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{
							type: "spring",
							stiffness: 200,
							damping: 25,
							delay: 0.1,
						}}
					>
						Profile Settings
					</motion.h3>
				</div>
			</header>

			{/* Main Content */}
			<Form {...form}>
				<form>
					<main className="p-8 mx-auto max-w-4xl space-y-8 flex flex-col items-center justify-center min-h-[calc(100dvh-4rem)]">
						<Button
							variant="ghost"
							size="lg"
							className="self-start mb-4"
							render={<Link to="/dashboard" />}
						>
							<CaretLeftIcon className="size-5" weight="bold" />
							<p>Back</p>
						</Button>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								type: "spring",
								stiffness: 200,
								damping: 25,
								delay: 0.2,
							}}
							className="space-y-8 w-full"
						>
							{/* Profile Picture Section */}
							{/* <ProfilePictureSection
								form={form}
								sectionState={profilePictureSection}
								uploadFile={uploadFile}
								uploadError={uploadError}
							/> */}

							{/* Personal Information */}
							<PersonalInfoSection form={form} sectionState={personalSection} />
							<Card>
								<CardHeader>
									<CardTitle>Change PIN</CardTitle>
									<CardDescription>
										Update your PIN with your current PIN, or reset it with your
										24-word recovery phrase if you forgot it.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<Tabs defaultValue="current-pin" className="w-full">
										<TabsList className="grid w-full max-w-md grid-cols-2">
											<TabsTrigger value="current-pin">Current PIN</TabsTrigger>
											<TabsTrigger value="phrase">Recovery phrase</TabsTrigger>
										</TabsList>
										<TabsContent value="current-pin" className="mt-4 space-y-4">
											<div className="space-y-2">
												<p className="text-sm font-medium">Current PIN</p>
												<OtpInput value={currentPin} onChange={setCurrentPin} />
											</div>
											<div className="space-y-2">
												<p className="text-sm font-medium">New PIN</p>
												<OtpInput value={newPin} onChange={setNewPin} />
											</div>
											<div className="space-y-2">
												<p className="text-sm font-medium">Confirm new PIN</p>
												<OtpInput value={confirmPin} onChange={setConfirmPin} />
											</div>
											{pinMessage && (
												<p className="text-sm text-muted-foreground">
													{pinMessage}
												</p>
											)}
											<Button
												type="button"
												onClick={handleRotatePin}
												disabled={!canRotatePin || rotatePin.isPending}
												variant="primary"
											>
												{rotatePin.isPending ? "Updating..." : "Update PIN"}
											</Button>
										</TabsContent>
										<TabsContent value="phrase" className="mt-4 space-y-4">
											<p className="text-sm text-muted-foreground">
												Enter the 24-word phrase you saved at registration. It
												must match the keys on-chain for this wallet.
											</p>
											<div className="space-y-2">
												<Label htmlFor="profile-recovery-phrase">
													Recovery phrase
												</Label>
												<Textarea
													id="profile-recovery-phrase"
													value={recoveryPhrase}
													onChange={(e) => setRecoveryPhrase(e.target.value)}
													placeholder="24-word recovery phrase"
													rows={5}
													className="min-h-28 resize-y"
												/>
											</div>
											<div className="space-y-2">
												<p className="text-sm font-medium">
													New PIN (6–10 digits)
												</p>
												<OtpInput
													value={phraseNewPin}
													onChange={setPhraseNewPin}
													length={10}
												/>
											</div>
											<div className="space-y-2">
												<p className="text-sm font-medium">Confirm new PIN</p>
												<OtpInput
													value={phraseConfirmPin}
													onChange={setPhraseConfirmPin}
													length={10}
												/>
											</div>
											{phraseMessage && (
												<p
													className={cn(
														"text-sm",
														phraseMessage.startsWith("PIN updated")
															? "text-muted-foreground"
															: "text-destructive",
													)}
												>
													{phraseMessage}
												</p>
											)}
											<Button
												type="button"
												onClick={handleRecoverWithPhrase}
												disabled={
													!canRecoverWithPhrase || recoverWithPhrase.isPending
												}
												variant="primary"
											>
												{recoverWithPhrase.isPending
													? "Updating..."
													: "Reset PIN with phrase"}
											</Button>
										</TabsContent>
									</Tabs>
								</CardContent>
							</Card>
							{/* Privy linked accounts */}
						</motion.div>
					</main>
				</form>
			</Form>
		</div>
	);
}
