import { base, baseSepolia, hardhat } from "viem/chains";
import env from "./env";

const chains = [hardhat, baseSepolia, base] as const;
export const privyChains = [...chains];
export const wagmiChains = chains;
export const defaultChain =
	env.VITE_CHAIN === "local"
		? hardhat
		: env.VITE_CHAIN === "testnet"
			? baseSepolia
			: base;

export const SUPPORTED_TOKENS = [
	{
		name: "USD Coin",
		symbol: "USDC",
		address:
			defaultChain === base
				? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" // mainnet USDC
				: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // testnet USDC
		icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Circle_USDC_Logo.svg/1280px-Circle_USDC_Logo.svg.png?_=20220815163658",
		decimals: 6,
		faucets: [{ name: "Circle Faucet", url: "https://faucet.circle.com" }],
	},
] as const;

/** Token symbol + decimals for PDF / UI when address is in the known list. */
export function erc20DisplayForChain(token: `0x${string}`): {
	label: string;
	decimals: number;
} {
	const t = SUPPORTED_TOKENS.find(
		(x) => x.address.toLowerCase() === token.toLowerCase(),
	);
	if (t) return { label: t.symbol, decimals: t.decimals };
	return {
		label: `${token.slice(0, 6)}…${token.slice(-4)}`,
		decimals: 18,
	};
}
