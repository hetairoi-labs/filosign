import { base, baseSepolia, hardhat } from "viem/chains";

const chains = [hardhat, baseSepolia, base] as const;
export const privyChains = [...chains];
export const wagmiChains = chains;
export const defaultChain =
	process.env.BUN_PUBLIC_CHAIN === "local"
		? hardhat
		: process.env.BUN_PUBLIC_CHAIN === "testnet"
			? baseSepolia
			: base;

console.log("BUN_PUBLIC_CHAIN", process.env.BUN_PUBLIC_CHAIN);
