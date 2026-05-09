import { $ } from "bun";
import hre from "hardhat";
import { toHex } from "viem";

const DEFINITIONS_FILE_PREFIX = "export const definitions = ";
const DEFINITIONS_FILE_SUFFIX = " as const;";

async function main() {
	const chainId = hre.network.config.chainId;
	if (!chainId) {
		console.error(
			"No chainId found in network config, how will we deploy to this network?",
		);
		process.exit(1);
	}

	const [deployer] = await hre.viem.getWalletClients();

	console.log("Deploying contracts as ", deployer.account.address);

	const manager = await hre.viem.deployContract("FSManager");
	const fileRegistry = await hre.viem.getContractAt(
		"FSFileRegistry",
		await manager.read.fileRegistry(),
	);
	const keyRegistry = await hre.viem.getContractAt(
		"FSKeyRegistry",
		await manager.read.keyRegistry(),
	);

	console.log("Contracts deployed");

	const definitions = {
		FSManager: {
			address: manager.address,
			abi: manager.abi,
		},
		FSFileRegistry: {
			address: fileRegistry.address,
			abi: fileRegistry.abi,
		},
		FSKeyRegistry: {
			address: keyRegistry.address,
			abi: keyRegistry.abi,
		},
	} as const;

	let existingDefinitions: Record<string, typeof definitions> = {};

	const definitionsFile = Bun.file("definitions.ts");
	try {
		const existingContent = await definitionsFile.text();

		// Validate file format before parsing
		if (
			existingContent.startsWith(DEFINITIONS_FILE_PREFIX) &&
			existingContent.endsWith(DEFINITIONS_FILE_SUFFIX)
		) {
			const definitionsJson = existingContent.slice(
				DEFINITIONS_FILE_PREFIX.length,
				existingContent.length - DEFINITIONS_FILE_SUFFIX.length,
			);
			existingDefinitions = JSON.parse(definitionsJson);
		}
	} catch (error) {
		console.error("Error reading definitions.ts:", error);
		// Reset to empty object if parsing fails
		existingDefinitions = {};
	}

	// Always add the new definitions, even if parsing failed
	existingDefinitions[toHex(chainId)] = definitions;

	await definitionsFile.write(
		DEFINITIONS_FILE_PREFIX +
			JSON.stringify(existingDefinitions, null, 2) +
			DEFINITIONS_FILE_SUFFIX,
	);

	console.log("Definitions written to definitions.ts");
	if (chainId === 314159) {
		try {
			await $`bunx --bun hardhat verify --network filecoinCalibration ${manager.address} --force`;
			await sleep(1000);
			await $`bunx --bun hardhat verify --network filecoinCalibration ${fileRegistry.address} --force`;
			await sleep(1500);
			await $`bunx --bun hardhat verify --network filecoinCalibration ${keyRegistry.address} --force`;
		} catch (_) {}
		console.log("Contracts verified on filecoin calibration block explorer");
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
