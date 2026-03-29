import { $ } from "bun";
import hre from "hardhat";
import { getAddress, toHex } from "viem";
import type { ChainKey } from "../definitions/index.js";

const DEFINITIONS_FILE_PREFIX = "export const definitions = ";
const DEFINITIONS_FILE_SUFFIX = " as const;";

const CHAIN_ID = {
	local: 31337,
	testnet: 4801,
	mainnet: 480,
} as const;

const WORLD_ID_ROUTER: Record<number, `0x${string}`> = {
	[CHAIN_ID.local]:
		"0x0000000000000000000000000000000000000000" as `0x${string}`,
	[CHAIN_ID.testnet]:
		"0x57f928158C3EE7CDad1e4D8642503c4D0201f611" as `0x${string}`,
	[CHAIN_ID.mainnet]:
		"0x17B354dD2595411ff79041f930e491A4Df39A278" as `0x${string}`,
};

const ACTION = process.env.WORLD_ACTION;

function chainName(chainId: number): ChainKey {
	if (chainId === CHAIN_ID.local) return "local";
	if (chainId === CHAIN_ID.testnet) return "testnet";
	if (chainId === CHAIN_ID.mainnet) return "mainnet";
	throw new Error(`Unsupported chainId ${chainId}`);
}

async function main() {
	const chainId = hre.network.config.chainId;

	if (!ACTION) {
		console.error("Error: WORLD_ACTION not set");
		process.exit(1);
	}

	if (!chainId) {
		console.error(
			"No chainId found in network config, how will we deploy to this network?",
		);
		process.exit(1);
	}

	const appId = process.env.WORLD_APP_ID;
	if (!appId) {
		console.error("Error: WORLD_APP_ID not set");
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

	let worldIdAddress: `0x${string}`;
	if (chainId === CHAIN_ID.local) {
		const mockWorldId = await hre.viem.deployContract("MockWorldID");
		worldIdAddress = mockWorldId.address;
		console.log("Deployed MockWorldID at", worldIdAddress);
	} else {
		worldIdAddress = WORLD_ID_ROUTER[chainId];
		if (!worldIdAddress) {
			console.error(`No World ID Router for chainId ${chainId}`);
			process.exit(1);
		}
		console.log("Using World ID Router at", worldIdAddress);
	}

	const manager = await hre.viem.deployContract("FSManager");
	const fileRegistry = await hre.viem.getContractAt(
		"FSFileRegistry",
		await manager.read.fileRegistry(),
	);
	const keyRegistry = await hre.viem.getContractAt(
		"FSKeyRegistry",
		await manager.read.keyRegistry(),
	);

	const worldVerifier = await hre.viem.deployContract("FSWorldVerifier", [
		worldIdAddress,
		appId,
		ACTION,
	]);

	await manager.write.setWorldVerifier([worldVerifier.address]);
	await fileRegistry.write.initializeWorldId([worldIdAddress, appId, ACTION]);

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
		FSWorldVerifier: {
			address: getAddress(worldVerifier.address),
			abi: worldVerifier.abi,
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
		appId,
		action: ACTION,
		worldIdAddress,
	});

	const networkName = hre.network.name;
	if (networkName === "worldchainSepolia" || networkName === "worldchain") {
		try {
			await $`bunx --bun hardhat verify --network ${networkName} ${manager.address} --force`;
			await sleep(1000);
			await $`bunx --bun hardhat verify --network ${networkName} ${fileRegistry.address} --force`;
			await sleep(1000);
			await $`bunx --bun hardhat verify --network ${networkName} ${keyRegistry.address} --force`;
			await sleep(1000);
			await $`bunx --bun hardhat verify --network ${networkName} ${worldVerifier.address} "${worldIdAddress}" "${appId}" "${ACTION}" --force`;
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
