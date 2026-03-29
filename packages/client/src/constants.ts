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

export const WORLD_CHAIN_SEPOLIA_TOKENS = [
	{
		name: "USD Coin",
		symbol: "USDC",
		address: "0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88",
		decimals: 6,
		faucets: [{ name: "Circle Faucet", url: "https://faucet.circle.com" }],
	},
	{
		name: "Wrapped Ether",
		symbol: "WETH",
		address: "0x4200000000000000000000000000000000000006",
		decimals: 18,
		faucets: [
			{
				name: "Alchemy",
				url: "https://www.alchemy.com/faucets/world-chain-sepolia",
			},
			{
				name: "ETHGlobal",
				url: "https://ethglobal.com/faucet/world-chain-sepolia-4801",
			},
			{
				name: "Google Cloud",
				url: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia",
			},
		],
	},
	{
		name: "Worldcoin",
		symbol: "WLD",
		address: "0x2e6621e5e3F916d5e512124dD79e06b55E258054",
		decimals: 18,
		faucets: [
			{
				name: "Worldcoin",
				url: "https://docs.world.org/mini-apps/quick-start/testing",
			},
		],
	},
	{
		name: "Chainlink",
		symbol: "LINK",
		address: "0xC82Efc286047746404801314B959088562B24801",
		decimals: 18,
		faucets: [{ name: "Chainlink", url: "https://faucets.chain.link/" }],
	},
	{
		name: "Pimlico Test",
		symbol: "PIM",
		address: "0xFC3e86566895Fb007c6A0d3809eb2827DF94F751",
		decimals: 18,
		faucets: [],
	},
] as const;
