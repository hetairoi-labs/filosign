import { hardhat, worldchain, worldchainSepolia } from "viem/chains";

const chains = [hardhat, worldchain, worldchainSepolia] as const;
export const privyChains = [...chains];
export const wagmiChains = chains;
export const defaultChain =
	Bun.env.BUN_PUBLIC_CHAIN === "local"
		? hardhat
		: Bun.env.BUN_PUBLIC_CHAIN === "testnet"
			? worldchainSepolia
			: worldchain;
