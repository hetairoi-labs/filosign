import { isHex } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import { hardhat, worldchain, worldchainSepolia } from "viem/chains";
import env from "./env";

const CHAIN_MAP = {
	local: hardhat,
	testnet: worldchainSepolia,
	mainnet: worldchain,
} as const;

const INDEXER = {
	CONFIRMATIONS: 0n,
	MAX_BATCH_BLOCKS: 200n,
	POLL_INTERVAL_MS: 2_000,
	LOGS_PER_TX: 10,
	DEFAULT_START_BLOCK: 3_081_600n,
	JOB_LOCK_TTL_MS: 30_000,
	DEFAULT_MAX_JOB_ATTEMPTS: 5,
	MAX_NODE_LOOKBACK_PERIOD_MS: 16 * 60 * 60 * 1000,
};

const chainKey = env.CHAIN as keyof typeof CHAIN_MAP;
const runtimeChain = CHAIN_MAP[chainKey];
if (!runtimeChain) {
	throw new Error(`Invalid CHAIN: ${env.CHAIN}`);
}

if (!isHex(env.EVM_PRIVATE_KEY_SYNAPSE)) {
	throw new Error(
		"EVM_PRIVATE_KEY_SYNAPSE is not set properly in environment variables",
	);
}

const serverAddressSynapse = privateKeyToAddress(env.EVM_PRIVATE_KEY_SYNAPSE);

const config = {
	runtimeChain,
	serverAddressSynapse,
	INDEXER,
};

export default config;
