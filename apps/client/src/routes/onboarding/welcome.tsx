import { createFileRoute } from "@tanstack/react-router";
import { coldInviteEntrySearchSchema } from "@/src/lib/routing/cold-invite-search";
import OnboardingWelcomeCompletePage from "@/src/pages/onboarding/welcome";

export const Route = createFileRoute("/onboarding/welcome")({
	validateSearch: coldInviteEntrySearchSchema,
	component: OnboardingWelcomeCompletePage,
});
