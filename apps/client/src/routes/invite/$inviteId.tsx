import { createFileRoute } from "@tanstack/react-router";
import InvitePage from "@/src/pages/invite";

export const Route = createFileRoute("/invite/$inviteId")({
	component: InvitePage,
});
