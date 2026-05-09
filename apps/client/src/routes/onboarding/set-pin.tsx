import { createFileRoute } from "@tanstack/react-router";
import OnboardingSetPinPage from "@/src/pages/onboarding/set-pin";

export const Route = createFileRoute("/onboarding/set-pin")({
	component: OnboardingSetPinPage,
});
