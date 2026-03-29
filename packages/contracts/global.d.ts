declare global {
	namespace NodeJS {
		interface ProcessEnv {
			FC_PVT_KEY: `0x${string}`;
			WORLD_ACTION: string;
			WORLD_APP_ID: string;
		}
	}
}

export {};
