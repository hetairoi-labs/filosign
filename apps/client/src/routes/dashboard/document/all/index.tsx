import { createFileRoute } from "@tanstack/react-router";
import DocumentAllPage from "@/src/pages/dashboard/document/all";

export const Route = createFileRoute("/dashboard/document/all/")({
	component: DocumentAllPage,
});
