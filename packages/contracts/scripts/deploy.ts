import { $ } from "bun";
import hre from "hardhat";
import { getAddress, toHex } from "viem";
import type { ChainKey } from "../definitions/index.js";

const DEFINITIONS_FILE_PREFIX = "export const definitions = ";
const DEFINITIONS_FILE_SUFFIX = " as const;";

const CHAIN_ID = {
	local: 31337,
	testnet: 84532, // Base Sepolia
	mainnet: 8453, // Base
} as const;

function chainName(chainId: number): ChainKey {
	if (chainId === CHAIN_ID.local) return "local";
	if (chainId === CHAIN_ID.testnet) return "testnet";
	if (chainId === CHAIN_ID.mainnet) return "mainnet";
	throw new Error(`Unsupported chainId ${chainId}`);
}

async function main() {
	const chainId = hre.network.config.chainId;

	if (!chainId) {
		console.error(
			"No chainId found in network config, how will we deploy to this network?",
		);
		process.exit(1);
	}

	const [deployer] = await hre.viem.getWalletClients();
	if (!deployer) {
		console.error("No deployer wallet found");
		process.exit(1);
	}

	console.log("Deploying contracts as", {
		address: deployer.account.address,
	});

	const manager = await hre.viem.deployContract("FSManager");
	const fileRegistry = await hre.viem.getContractAt(
		"FSFileRegistry",
		await manager.read.fileRegistry(),
	);
	const keyRegistry = await hre.viem.getContractAt(
		"FSKeyRegistry",
		await manager.read.keyRegistry(),
	);
	const escrow = await hre.viem.getContractAt(
		"FSEscrow",
		await manager.read.escrow(),
	);

	console.log("Contracts deployed");

	const definitions = {
		FSManager: {
			address: getAddress(manager.address),
			abi: manager.abi,
		},
		FSFileRegistry: {
			address: getAddress(fileRegistry.address),
			abi: fileRegistry.abi,
		},
		FSKeyRegistry: {
			address: getAddress(keyRegistry.address),
			abi: keyRegistry.abi,
		},
		FSEscrow: {
			address: getAddress(escrow.address),
			abi: escrow.abi,
		},
	} as const;

	const envName = chainName(chainId);
	const singleChainDefinitions = { [toHex(chainId)]: definitions };
	const definitionsPath = `definitions/${envName}.ts`;
	await Bun.write(
		definitionsPath,
		DEFINITIONS_FILE_PREFIX +
			JSON.stringify(singleChainDefinitions, null, 2) +
			DEFINITIONS_FILE_SUFFIX,
	);
	console.log(`Definitions written to ${definitionsPath}`);

	console.log({
		chain: envName,
		chainId,
	});

	const networkName = hre.network.name;
	if (networkName === "baseSepolia" || networkName === "base") {
		try {
			await $`bunx --bun hardhat verify --network ${networkName} ${manager.address} --force`;
			await sleep(1000);
			await $`bunx --bun hardhat verify --network ${networkName} ${fileRegistry.address} --force`;
			await sleep(1000);
			await $`bunx --bun hardhat verify --network ${networkName} ${keyRegistry.address} --force`;
			await sleep(1000);
			await $`bunx --bun hardhat verify --network ${networkName} ${escrow.address} --force`;
		} catch (_) {}
		console.log(`Contracts verified on ${networkName} block explorer`);
	}
}

async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

main()
	.then(() => console.log("Deployment script finished"))
	.catch((e) => {
		console.error(e);
		process.exit(1);
	});
