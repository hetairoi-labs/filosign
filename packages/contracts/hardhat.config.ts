import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";

const config: HardhatUserConfig = {
	solidity: {
		version: "0.8.26",
		settings: {
			optimizer: {
				enabled: true,
				runs: 400,
			},
			viaIR: true,
		},
	},
	sourcify: { enabled: false },
	paths: {
		sources: "./src",
	},
	networks: {
		hardhat: {
			allowUnlimitedContractSize: true,
		},
		localhost: {
			url: "http://127.0.0.1:8545",
			chainId: 31337,
		},
		base: {
			url: "https://mainnet.base.org",
			accounts: [Bun.env.FC_PVT_KEY],
			chainId: 8453,
		},
		baseSepolia: {
			url: "https://sepolia.base.org",
			accounts: [Bun.env.FC_PVT_KEY],
			chainId: 84532,
		},
	},
	etherscan: {
		apiKey:
			process.env.BLOCKSCOUT_API_KEY ??
			process.env.ETHERSCAN_API_KEY ??
			process.env.BASESCAN_API_KEY ??
			"no-api-key",
		customChains: [
			{
				network: "base",
				chainId: 8453,
				urls: {
					apiURL: "https://api.basescan.org/api",
					browserURL: "https://basescan.org",
				},
			},
			{
				network: "baseSepolia",
				chainId: 84532,
				urls: {
					apiURL: "https://api-sepolia.basescan.org/api",
					browserURL: "https://sepolia.basescan.org",
				},
			},
		],
	},
};

export default config;
