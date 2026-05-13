import { createFileRoute } from "@tanstack/react-router";
import { coldInviteEntrySearchSchema } from "@/src/lib/routing/cold-invite-search";
import OnboardingWelcomePage from "@/src/pages/onboarding";

export const Route = createFileRoute("/onboarding/")({
	validateSearch: coldInviteEntrySearchSchema,
	component: OnboardingWelcomePage,
});
