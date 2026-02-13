import { useIsRegistered, useLogin } from "@filosign/react/hooks";
import { CaretRightIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
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
import { useStorePersist } from "@/src/lib/hooks/use-store";
import OnboardingProtector from "./_components/OnboardingProtector";
import OtpInput from "./_components/OtpInput";

export default function OnboardingSetPinPage() {
	const [pin, setPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [step, setStep] = useState<"enter" | "confirm">("enter");
	const navigate = useNavigate();
	const { onboardingForm, setOnboardingForm: _setOnboardingForm } =
		useStorePersist();

	const login = useLogin();
	const isRegistered = useIsRegistered();

	const handleRegistration = async () => {
		if (!onboardingForm) return;

		try {
			if (isRegistered.data) {
				toast.success("You are already registered!");
				navigate({ to: "/dashboard" });
				return;
			}

			await login.mutateAsync({
				pin: pin,
			});

			window.location.href = "/onboarding/welcome";
		} catch (error) {
			console.error("Registration failed:", error);
			toast.error("Registration failed. Please try again or contact support.");
		}
	};

	const handlePinSubmit = () => {
		if (pin.length === 6) {
			if (step === "enter") {
				setStep("confirm");
				setConfirmPin("");
			} else if (step === "confirm") {
				if (pin === confirmPin) {
					handleRegistration();
				} else {
					setConfirmPin("");
				}
			}
		}
	};

	const handleBack = () => {
		if (step === "confirm") {
			setStep("enter");
			setConfirmPin("");
		} else {
			navigate({ to: "/onboarding" });
		}
	};

	const currentPin = step === "enter" ? pin : confirmPin;
	const isComplete = currentPin.length === 6;
	const isPinMismatch =
		step === "confirm" && confirmPin.length === 6 && pin !== confirmPin;

	return (
		<OnboardingProtector>
			<div className="flex justify-center items-center min-h-screen">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3, delay: 0.2 }}
					className="flex flex-col justify-center items-center px-8 mx-auto w-full max-w-lg"
				>
					<Logo
						className="mb-4"
						textClassName="text-foreground font-semibold"
					/>
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3, delay: 0.2 }}
						className="flex flex-col justify-center items-center px-8 mx-auto w-full max-w-lg"
					>
						<Card className="w-full">
							<CardHeader>
								<CardTitle>
									{step === "enter" ? "Setup your PIN" : "Confirm PIN"}
								</CardTitle>
								<CardDescription>
									{step === "enter"
										? "Choose a 6-digit PIN for your account"
										: "Re-enter your PIN to confirm"}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex flex-col gap-2">
									<OtpInput
										value={currentPin}
										onChange={step === "enter" ? setPin : setConfirmPin}
										length={6}
										autoFocus={true}
										onSubmit={handlePinSubmit}
									/>
								</div>

								{isPinMismatch && (
									<p className="text-destructive text-sm">
										PINs don't match. Please try again.
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

									<Button
										onClick={handlePinSubmit}
										onKeyDown={(e) => {
											if (e.key === "Enter" && isComplete) {
												handlePinSubmit();
											}
										}}
										disabled={!isComplete}
										className="flex-1 group"
										variant="primary"
									>
										{step === "enter" ? "Continue" : "Confirm"}
										<CaretRightIcon
											className="transition-transform duration-200 size-4 group-hover:translate-x-1"
											weight="bold"
										/>
									</Button>
								</div>
							</CardContent>
						</Card>
					</motion.div>
				</motion.div>
			</div>
		</OnboardingProtector>
	);
}
