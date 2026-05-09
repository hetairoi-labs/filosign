import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_CHAIN: z.enum(["local", "testnet", "mainnet"]),
		VITE_PRIVY_APP_ID: z.string().min(1),
		VITE_PLATFORM_URL: z.string().min(1).url(),
	},
	runtimeEnv: import.meta.env,
	emptyStringAsUndefined: true,
});

export default env;
