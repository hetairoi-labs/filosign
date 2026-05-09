import { createFileRoute } from "@tanstack/react-router";
import OnboardingWelcomeCompletePage from "@/src/pages/onboarding/welcome";

export const Route = createFileRoute("/onboarding/welcome")({
	component: OnboardingWelcomeCompletePage,
});
