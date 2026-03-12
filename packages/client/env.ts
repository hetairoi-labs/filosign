import z from "zod";

const clientEnvSchema = z.object({
	BUN_PUBLIC_RUNTIME_CHAIN_ID: z.string(),
	BUN_PUBLIC_PRIVY_APP_ID: z.string(),
	BUN_PUBLIC_PLATFORM_URL: z.string(),
	BUN_PUBLIC_WORLD_APP_ID: z.string(),
});

const envSchema = z.object({
	...clientEnvSchema.shape,
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	PRIVY_APP_SECRET: z.string(),
	PORT: z.coerce.number().int().positive("PORT must be a positive integer"),
});

type EnvSchema = z.infer<typeof envSchema>;

// declare env for process.env intellisense
declare module "bun" {
	interface Env extends EnvSchema {}
}

// validate env
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

export const env = getEnv();
