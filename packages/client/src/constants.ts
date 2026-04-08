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

export const WORLD_CHAIN_SEPOLIA_TOKENS = [
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
	// {
	// 	name: "Wrapped Ether",
	// 	symbol: "WETH",
	// 	address: "0x4200000000000000000000000000000000000006",
	// 	decimals: 18,
	// 	faucets: [
	// 		{
	// 			name: "Alchemy",
	// 			url: "https://www.alchemy.com/faucets/world-chain-sepolia",
	// 		},
	// 		{
	// 			name: "ETHGlobal",
	// 			url: "https://ethglobal.com/faucet/world-chain-sepolia-4801",
	// 		},
	// 		{
	// 			name: "Google Cloud",
	// 			url: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia",
	// 		},
	// 	],
	// },
	// {
	// 	name: "Worldcoin",
	// 	symbol: "WLD",
	// 	address: "0x2cFc85d8E48F8EAB294be644d9E25C3030863003",
	// 	icon: "https://cryptologos.cc/logos/worldcoin-org-wld-logo.svg?v=040",
	// 	decimals: 18,
	// 	faucets: [
	// 		{
	// 			name: "Worldcoin",
	// 			url: "https://docs.world.org/mini-apps/quick-start/testing",
	// 		},
	// 	],
	// },
	// {
	// 	name: "Chainlink",
	// 	symbol: "LINK",
	// 	address: "0xC82Efc286047746404801314B959088562B24801",
	// 	decimals: 18,
	// 	icon: "https://cryptologos.cc/logos/chainlink-link-logo.svg?v=040",
	// 	faucets: [{ name: "Chainlink", url: "https://faucets.chain.link/" }],
	// },
] as const;

/** Token symbol + decimals for PDF / UI when address is in the known list. */
export function erc20DisplayForChain(token: `0x${string}`): {
	label: string;
	decimals: number;
} {
	const t = WORLD_CHAIN_SEPOLIA_TOKENS.find(
		(x) => x.address.toLowerCase() === token.toLowerCase(),
	);
	if (t) return { label: t.symbol, decimals: t.decimals };
	return {
		label: `${token.slice(0, 6)}…${token.slice(-4)}`,
		decimals: 18,
	};
}
