declare module "*.svg" {
	const content: string;
	export default content;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_CHAIN: "local" | "testnet" | "mainnet";
	readonly VITE_PRIVY_APP_ID: string;
	readonly VITE_PLATFORM_URL: string;
	readonly VITE_MARKETING_SITE_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
