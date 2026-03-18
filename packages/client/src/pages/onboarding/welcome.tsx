import {
	useCreateCheckout,
	useIsLoggedIn,
	useUpdateUserProfile,
} from "@filosign/react/hooks";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
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

export default function OnboardingWelcomeCompletePage() {
	const [userName, setUserName] = useState("");
	const { onboardingForm, setOnboardingForm } = useStorePersist();
	const isLoggedIn = useIsLoggedIn();
	const updateUserProfile = useUpdateUserProfile();
	const createCheckout = useCreateCheckout();

	useEffect(() => {
		if (onboardingForm?.firstName || onboardingForm?.lastName) {
			setUserName(`${onboardingForm.firstName} ${onboardingForm.lastName}`);
		}
	}, [onboardingForm]);

	async function handleSubmit() {
		if (!isLoggedIn.data) {
			toast.error("Preparing your account...");
			return;
		}

		if (onboardingForm?.firstName) {
			await updateUserProfile.mutateAsync({
				firstName: onboardingForm.firstName,
				lastName: onboardingForm.lastName ? onboardingForm.lastName : undefined,
			});

			setOnboardingForm({
				...onboardingForm,
				firstName: "",
				lastName: "",
				hasOnboarded: true,
			});
		}

		const data = await createCheckout.mutateAsync();
		window.location.href = data.checkoutUrl;
	}

	return (
		<div className="flex justify-center items-center min-h-screen">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3, delay: 0.2 }}
				className="flex flex-col justify-center items-center px-8 mx-auto w-full max-w-lg"
			>
				<Logo className="mb-4" textClassName="text-foreground font-semibold" />
				<Card className="w-full">
					<CardHeader>
						<CardTitle>All Set, {userName.split(" ")[0]}!</CardTitle>
						<CardDescription>Your Filosign account is ready.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Button
							className="w-full group"
							variant="primary"
							onClick={handleSubmit}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									handleSubmit();
								}
							}}
						>
							Start Free Trial
						</Button>
					</CardContent>
				</Card>
			</motion.div>
		</div>
	);
}
