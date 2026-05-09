import { createFileRoute } from "@tanstack/react-router";
import AddSignaturePage from "@/src/pages/dashboard/envelope/create/add-sign";

export const Route = createFileRoute("/dashboard/envelope/create/add-sign/")({
	component: AddSignaturePage,
});
