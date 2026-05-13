import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import OnboardingWelcomePage from "@/src/pages/onboarding";

export const Route = createFileRoute("/onboarding/")({
	validateSearch: z.object({
		coldPieceCid: z.string().optional(),
		coldInvite: z.string().optional(),
	}),
	component: OnboardingWelcomePage,
});
