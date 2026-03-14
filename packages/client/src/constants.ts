import { hardhat, worldchain, worldchainSepolia } from "viem/chains";

/** Standardized everywhere: local=hardhat (31337), testnet=worldchainSepolia (4801), mainnet=worldchain (480) */
const chains = [hardhat, worldchain, worldchainSepolia] as const;
export const privyChains = [...chains];
export const wagmiChains = chains;
export const defaultChain =
	Bun.env.BUN_PUBLIC_CHAIN === "local"
		? hardhat
		: Bun.env.BUN_PUBLIC_CHAIN === "testnet"
			? worldchainSepolia
			: worldchain;
