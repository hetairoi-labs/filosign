import { createFileRoute } from "@tanstack/react-router";
import FilesPage from "@/src/pages/dashboard/files";

export const Route = createFileRoute("/dashboard/files/")({
	component: FilesPage,
});
