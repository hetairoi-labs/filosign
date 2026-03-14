import { hardhat, worldchain, worldchainSepolia } from "viem/chains";

const chains = [hardhat, worldchain, worldchainSepolia] as const;
export const privyChains = [...chains];
export const wagmiChains = chains;
export const defaultChain =
	process.env.BUN_PUBLIC_CHAIN === "local"
		? hardhat
		: process.env.BUN_PUBLIC_CHAIN === "testnet"
			? worldchainSepolia
			: worldchain;

console.log("BUN_PUBLIC_CHAIN", process.env.BUN_PUBLIC_CHAIN);
