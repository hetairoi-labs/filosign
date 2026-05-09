import { createFileRoute } from "@tanstack/react-router";
import ConnectionsPage from "@/src/pages/dashboard/connections";

export const Route = createFileRoute("/dashboard/connections/")({
	component: ConnectionsPage,
});
