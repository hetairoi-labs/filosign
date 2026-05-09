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
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { useProfileSettings } from "./hooks/use-profile-settings";
import { PersonalInfoSection } from "./PersonalInfoSection";

export default function ProfilePage() {
	const {
		form,
		personalSection,
		rotatePin,
		currentPin,
		newPin,
		confirmPin,
		pinMessage,
		setCurrentPin,
		setNewPin,
		setConfirmPin,
		setPinMessage,
		canRotatePin,
	} = useProfileSettings();

	const handleRotatePin = async () => {
		setPinMessage(null);
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
										Update your account PIN without re-registering.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="current-pin">Current PIN</Label>
										<Input
											id="current-pin"
											value={currentPin}
											onChange={(event) =>
												setCurrentPin(event.target.value.replace(/\D/g, ""))
											}
											maxLength={10}
											inputMode="numeric"
											placeholder="Current PIN"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="new-pin">New PIN</Label>
										<Input
											id="new-pin"
											value={newPin}
											onChange={(event) =>
												setNewPin(event.target.value.replace(/\D/g, ""))
											}
											maxLength={10}
											inputMode="numeric"
											placeholder="New PIN (6-10 digits)"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="confirm-pin">Confirm New PIN</Label>
										<Input
											id="confirm-pin"
											value={confirmPin}
											onChange={(event) =>
												setConfirmPin(event.target.value.replace(/\D/g, ""))
											}
											maxLength={10}
											inputMode="numeric"
											placeholder="Confirm new PIN"
										/>
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
