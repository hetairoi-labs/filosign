import { motion } from "motion/react";
import CreateNewSignaturePage from "../dashboard/signature/create";
import OnboardingProtector from "./_components/OnboardingProtector";

export default function OnboardingCreateSignaturePage() {
	return (
		<OnboardingProtector>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3, delay: 0.3 }}
			>
				<CreateNewSignaturePage onboarding={true} />
			</motion.div>
		</OnboardingProtector>
	);
}
