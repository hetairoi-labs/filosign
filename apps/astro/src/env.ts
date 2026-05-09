import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/** Marketing site env: client app URL + API/server URL (redirects, health, future API calls). */
export const env = createEnv({
	clientPrefix: "PUBLIC_",
	client: {
		PUBLIC_APP_URL: z.string().url().default("http://localhost:5173"),
		PUBLIC_SERVER_URL: z.string().url().default("http://localhost:3000"),
	},
	runtimeEnv: {
		PUBLIC_APP_URL: import.meta.env.PUBLIC_APP_URL,
		PUBLIC_SERVER_URL: import.meta.env.PUBLIC_SERVER_URL,
	},
});
