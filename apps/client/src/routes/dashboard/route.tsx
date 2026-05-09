import { createFileRoute, Outlet } from "@tanstack/react-router";
import DashboardProtector from "@/src/lib/components/custom/DashboardProtector";

export const Route = createFileRoute("/dashboard")({
	component: () => (
		<DashboardProtector>
			<Outlet />
		</DashboardProtector>
	),
});
