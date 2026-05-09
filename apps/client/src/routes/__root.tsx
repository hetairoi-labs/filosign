import { createRootRoute, Outlet } from "@tanstack/react-router";
import { NotFound } from "@/src/lib/components/custom/NotFound";

export const Route = createRootRoute({
	component: () => <Outlet />,
	notFoundComponent: () => <NotFound />,
});
