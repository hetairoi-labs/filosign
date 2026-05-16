import type { ChainKey } from "@filosign/contracts";
import type { Address, Chain } from "viem";
import config from "@/config";
import { fsContracts } from "@/lib/evm";

export type PlatformRuntime = {
	uptime: number;
	serverAddressSynapse: string;
	chain: Chain;
	chainKey: ChainKey;
	platformFeeBps: number;
	maxPlatformFeeBps: number;
	treasury: Address;
};

export async function loadPlatformRuntime(): Promise<PlatformRuntime> {
	const [platformFeeBps, maxPlatformFeeBps, treasury] = await Promise.all([
		fsContracts.FSManager.read.platformFeeBps(),
		fsContracts.FSManager.read.MAX_PLATFORM_FEE_BPS(),
		fsContracts.FSManager.read.treasury(),
	]);
	return {
		uptime: process.uptime(),
		serverAddressSynapse: config.serverAddressSynapse,
		chain: config.runtimeChain,
		chainKey: config.chainKey,
		platformFeeBps: Number(platformFeeBps),
		maxPlatformFeeBps: Number(maxPlatformFeeBps),
		treasury,
	};
}
