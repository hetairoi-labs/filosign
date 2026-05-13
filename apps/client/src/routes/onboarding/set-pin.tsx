import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import OnboardingSetPinPage from "@/src/pages/onboarding/set-pin";

export const Route = createFileRoute("/onboarding/set-pin")({
	validateSearch: z.object({
		coldPieceCid: z.string().optional(),
		coldInvite: z.string().optional(),
	}),
	component: OnboardingSetPinPage,
});
