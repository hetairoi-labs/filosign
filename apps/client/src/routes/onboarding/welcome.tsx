import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import OnboardingWelcomeCompletePage from "@/src/pages/onboarding/welcome";

export const Route = createFileRoute("/onboarding/welcome")({
	validateSearch: z.object({
		coldPieceCid: z.string().optional(),
		coldInvite: z.string().optional(),
	}),
	component: OnboardingWelcomeCompletePage,
});
