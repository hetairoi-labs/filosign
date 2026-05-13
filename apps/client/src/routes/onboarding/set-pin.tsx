import { createFileRoute } from "@tanstack/react-router";
import { coldInviteEntrySearchSchema } from "@/src/lib/routing/cold-invite-search";
import OnboardingSetPinPage from "@/src/pages/onboarding/set-pin";

export const Route = createFileRoute("/onboarding/set-pin")({
	validateSearch: coldInviteEntrySearchSchema,
	component: OnboardingSetPinPage,
});
