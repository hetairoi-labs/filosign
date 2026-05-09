import { createFileRoute } from "@tanstack/react-router";
import OnboardingWelcomePage from "@/src/pages/onboarding";

export const Route = createFileRoute("/onboarding/")({
	component: OnboardingWelcomePage,
});
