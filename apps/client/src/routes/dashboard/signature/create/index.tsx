import { createFileRoute } from "@tanstack/react-router";
import CreateNewSignaturePage from "@/src/pages/dashboard/signature/create";

export const Route = createFileRoute("/dashboard/signature/create/")({
	component: CreateNewSignaturePage,
});
