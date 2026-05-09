import { createFileRoute } from "@tanstack/react-router";
import OnboardingCreateSignaturePage from "@/src/pages/onboarding/create-signature";

export const Route = createFileRoute("/onboarding/create-signature")({
	component: OnboardingCreateSignaturePage,
});
