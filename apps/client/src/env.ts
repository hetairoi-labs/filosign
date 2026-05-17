import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_CHAIN: z.enum(["local", "testnet", "mainnet"]),
		VITE_PRIVY_APP_ID: z.string().min(1),
		VITE_SERVER_URL: z.url(),
		VITE_ASTRO_URL: z.url(),
		VITE_CLIENT_URL: z.url(),
	},
	runtimeEnv: import.meta.env,
	emptyStringAsUndefined: true,
});

export default env;
