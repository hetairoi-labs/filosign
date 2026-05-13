import { CaretRightIcon } from "@phosphor-icons/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import Logo from "@/src/lib/components/custom/Logo";
import { Button } from "@/src/lib/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { useStorePersist } from "@/src/lib/hooks/use-store";
import OnboardingProtector from "./_components/OnboardingProtector";
import { OnboardingSwitchAccountLink } from "./_components/OnboardingSwitchAccountLink";

export default function OnboardingWelcomePage() {
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const { setOnboardingForm } = useStorePersist();
	const navigate = useNavigate();
	const search = useSearch({ from: "/onboarding/" });

	const coldReturn =
		search.coldPieceCid && search.coldInvite
			? { coldPieceCid: search.coldPieceCid, coldInvite: search.coldInvite }
			: undefined;

	const handleContinue = () => {
		setOnboardingForm({
			firstName: firstName.trim(),
			lastName: lastName.trim(),
			pin: "",
			hasOnboarded: false,
		});
		navigate({
			to: "/onboarding/set-pin",
			...(coldReturn ? { search: coldReturn } : {}),
		});
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && firstName.trim()) {
			handleContinue();
		}
	};

	return (
		<OnboardingProtector>
			<div className="flex justify-center items-center min-h-screen bg-background">
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
					<Card className="w-full">
						<CardHeader>
							<CardTitle>Welcome aboard!</CardTitle>
							<CardDescription>
								Let's get you set up with filosign.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div className="flex flex-col gap-2">
									<Label>First Name</Label>
									<Input
										value={firstName}
										onChange={(e) => setFirstName(e.target.value)}
										onKeyDown={handleKeyPress}
										placeholder="John"
										autoFocus
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label>Last Name</Label>
									<Input
										value={lastName}
										onChange={(e) => setLastName(e.target.value)}
										onKeyDown={handleKeyPress}
										placeholder="Doe"
									/>
								</div>
							</div>
							<Button
								onClick={handleContinue}
								disabled={!firstName.trim()}
								className="w-full group"
								variant="primary"
							>
								Continue
								<CaretRightIcon
									className="transition-transform duration-200 size-4 group-hover:translate-x-1"
									weight="bold"
								/>
							</Button>
						</CardContent>
					</Card>
					<OnboardingSwitchAccountLink />
				</motion.div>
			</div>
		</OnboardingProtector>
	);
}
