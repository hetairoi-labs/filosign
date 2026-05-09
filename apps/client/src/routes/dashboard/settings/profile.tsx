import { createFileRoute } from "@tanstack/react-router";
import ProfilePage from "@/src/pages/dashboard/profile";

export const Route = createFileRoute("/dashboard/settings/profile")({
	component: ProfilePage,
});
