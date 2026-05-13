import { createFileRoute } from "@tanstack/react-router";
import { coldInviteEntrySearchSchema } from "@/src/lib/routing/cold-invite-search";
import SignInPage from "@/src/pages/sign-in";

export const Route = createFileRoute("/")({
	validateSearch: coldInviteEntrySearchSchema,
	component: SignInPage,
});
