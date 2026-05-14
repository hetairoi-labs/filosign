import env from "@/env";

/** Public web app origin (no trailing slash). Used for links in email and elsewhere. */
export function getPublicAppUrl(): string {
	return env.FRONTEND_URL.replace(/\/$/, "");
}
