import z from "zod";

const envSchema = z.object({
	TG_ANALYTICS_BOT_GROUP_ID: z.string(),
	TG_ANALYTICS_BOT_TOKEN: z.string(),
	S3_SECRET_ACCESS_KEY: z.string(),
	S3_ACCESS_KEY_ID: z.string(),
	S3_BUCKET: z.string(),
	S3_ENDPOINT: z.string(),
	EVM_PRIVATE_KEY_SYNAPSE: z.string(),
	EVM_PRIVATE_KEY_SERVER: z.string(),
	PG_URI: z.string(),
	DB_NAME: z.string(),
	FRONTEND_URL: z.string(),
	CHAIN: z.enum(["local", "testnet", "mainnet"]),
	SUPER_PASS: z.string(),
	WORLD_ID_RP_ID: z.string(),
	WORLD_ID_SIGNING_KEY: z.string(),

	POLAR_ACCESS_TOKEN: z.string(),
	POLAR_MODE: z.enum(["sandbox", "production"]),
	POLAR_SUCCESS_URL: z.url(),
	POLAR_WEBHOOK_SECRET: z.string(),
	POLAR_PRODUCT_ID: z.string(),
});

type EnvSchema = z.infer<typeof envSchema>;

declare module "bun" {
	interface Env extends EnvSchema {}
}

let _env: EnvSchema | null = null;
const getEnv = (): EnvSchema => {
	if (!_env) {
		try {
			const parsedEnv = envSchema.parse(Bun.env);
			_env = parsedEnv;
		} catch (error) {
			if (error instanceof z.ZodError) {
				const errorMessages = error.issues
					.map((err) => `${err.path.join(".")}: ${err.message}`)
					.join("\n");
				throw new Error(`Environment validation failed:\n${errorMessages}`);
			}
			throw error;
		}
	}
	return _env;
};

export default getEnv();
