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
	sourcify: { enabled: true },
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
		worldChainSepolia: {
			accounts: [Bun.env.FC_PVT_KEY],
			chainId: 4801,
			url: "https://worldchain-sepolia.g.alchemy.com/public",
		},
		worldChainMainnet: {
			accounts: [Bun.env.FC_PVT_KEY],
			chainId: 480,
			url: "https://worldchain-mainnet.g.alchemy.com/public",
		},
	},
	etherscan: {
		apiKey: {
			worldChainSepolia: process.env.BLOCKSCOUT_API_KEY ?? "no-api-key",
			worldChainMainnet: process.env.BLOCKSCOUT_API_KEY ?? "no-api-key",
		},
		customChains: [
			{
				network: "worldChainSepolia",
				chainId: 4801,
				urls: {
					apiURL: "https://worldchain-sepolia.explorer.alchemy.com/api",
					browserURL: "https://sepolia.worldscan.org",
				},
			},
			{
				network: "worldChainMainnet",
				chainId: 480,
				urls: {
					apiURL: "https://worldchain-mainnet.explorer.alchemy.com/api",
					browserURL: "https://worldscan.org",
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
