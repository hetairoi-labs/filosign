import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		// Server-side only variables
		APP_URL: z.string().url().default("http://localhost:5173"),
		API_URL: z.string().url().optional(),
		SERVER_URL: z.string().url().optional(),
	},
	clientPrefix: "PUBLIC_",
	client: {
		// Public variables exposed to browser
		PUBLIC_APP_URL: z.string().url().default("http://localhost:5173"),
		PUBLIC_API_URL: z.string().url().optional(),
		PUBLIC_SITE_URL: z.string().url().default("https://filosign.io"),
	},
	runtimeEnv: {
		// Server-side
		APP_URL: import.meta.env.APP_URL,
		API_URL: import.meta.env.API_URL,
		SERVER_URL: import.meta.env.SERVER_URL,
		// Client-side (public)
		PUBLIC_APP_URL: import.meta.env.PUBLIC_APP_URL,
		PUBLIC_API_URL: import.meta.env.PUBLIC_API_URL,
		PUBLIC_SITE_URL: import.meta.env.PUBLIC_SITE_URL,
	},
});
