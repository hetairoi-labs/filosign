import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		FC_PVT_KEY: z.string().min(1),
		ALCHEMY_API_KEY: z.string().min(1),
		ETHERSCAN_API_KEY: z.string().min(1).optional(),
		BLOCKSCOUT_API_KEY: z.string().min(1).optional(),
	},
	runtimeEnv: Bun.env,
	emptyStringAsUndefined: true,
});

export default env;
