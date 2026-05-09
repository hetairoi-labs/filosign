import { createFileRoute } from "@tanstack/react-router";
import CreateEnvelopePage from "@/src/pages/dashboard/envelope/create/create";

export const Route = createFileRoute("/dashboard/envelope/create/")({
	component: CreateEnvelopePage,
});
