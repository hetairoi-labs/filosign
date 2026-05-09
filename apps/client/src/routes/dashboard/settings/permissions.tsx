import { createFileRoute } from "@tanstack/react-router";
import PermissionsPage from "@/src/pages/dashboard/permissions";

export const Route = createFileRoute("/dashboard/settings/permissions")({
	component: PermissionsPage,
});
