import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import SignDocumentPage from "@/src/pages/dashboard/document/sign";

export const Route = createFileRoute("/dashboard/document/sign/")({
	validateSearch: z.object({
		pieceCid: z.string().optional().default(""),
	}),
	component: SignDocumentPage,
});
