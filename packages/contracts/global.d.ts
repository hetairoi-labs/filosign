declare global {
	namespace NodeJS {
		interface ProcessEnv {
			FC_PVT_KEY: `0x${string}`;
		}
	}
}

export {};
