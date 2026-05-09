import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		TG_ANALYTICS_BOT_GROUP_ID: z.string().min(1),
		TG_ANALYTICS_BOT_TOKEN: z.string().min(1),
		S3_SECRET_ACCESS_KEY: z.string().min(1),
		S3_ACCESS_KEY_ID: z.string().min(1),
		S3_BUCKET: z.string().min(1),
		S3_ENDPOINT: z.string().min(1).url(),
		EVM_PRIVATE_KEY_SYNAPSE: z.string().min(1),
		EVM_PRIVATE_KEY_SERVER: z.string().min(1),
		PG_URI: z.string().min(1),
		DB_NAME: z.string().min(1),
		FRONTEND_URL: z.string().min(1).url(),
		RESEND_API_KEY: z.string().min(1),
		RESEND_FROM_EMAIL: z.string().min(1).email(),
		CHAIN: z.enum(["local", "testnet", "mainnet"]),
		SUPER_PASS: z.string().min(1),
		PORT: z
			.string()
			.transform((v) => parseInt(v, 10))
			.optional(),
		SESSION_MASTER_KEY: z.string().min(32),
		/** HS512 signing secret; must be independent of EVM private keys */
		JWT_SECRET: z.string().min(32),
	},
	runtimeEnv: Bun.env,
	emptyStringAsUndefined: true,
});

export default env;
