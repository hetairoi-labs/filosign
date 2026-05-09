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
			evmVersion: "cancun",
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
		filecoinCalibration: {
			accounts: [Bun.env.FC_PVT_KEY],
			chainId: 314159,
			url: "https://api.calibration.node.glif.io/rpc/v1",
		},
		baseSepolia: {
			accounts: [Bun.env.FC_PVT_KEY],
			chainId: 84532,
			url: `https://base-sepolia.g.alchemy.com/v2/${Bun.env.ALCHEMY_API_KEY}`,
		},
		base: {
			accounts: [Bun.env.FC_PVT_KEY],
			chainId: 8453,
			url: `https://base-mainnet.g.alchemy.com/v2/${Bun.env.ALCHEMY_API_KEY}`,
		},
	},
	etherscan: {
		apiKey:
			process.env.BLOCKSCOUT_API_KEY ??
			process.env.ETHERSCAN_API_KEY ??
			"no-api-key",
		customChains: [
			{
				network: "baseSepolia",
				chainId: 84532,
				urls: {
					apiURL: "https://api-sepolia.basescan.org/api",
					browserURL: "https://sepolia.basescan.org",
				},
			},
			{
				network: "base",
				chainId: 8453,
				urls: {
					apiURL: "https://api.basescan.org/api",
					browserURL: "https://basescan.org",
				},
			},
			{
				network: "filecoinCalibration",
				chainId: 314159,
				urls: {
					apiURL: "https://filecoin-testnet.blockscout.com/api",
					browserURL: "https://filecoin-testnet.blockscout.com",
				},
			},
		],
	},
};

export default config;
