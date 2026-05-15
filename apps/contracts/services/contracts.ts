import {
	type Account,
	type Client,
	createPublicClient,
	type GetContractReturnType,
	getContract,
	http,
	type PublicClient,
	type Transport,
	type Chain as ViemChain,
	type WalletClient,
} from "viem";
import {
	type ChainDefinitionsEntry,
	type ChainKey,
	getDefinitionsEntry,
} from "../definitions/index";

export type { ChainKey } from "../definitions/index";

type Wallet = WalletClient<Transport, ViemChain, Account>;

/** Avoid TS7056 (inferred node exceeds serialization limit). */
export type FilosignContracts<T extends Wallet = Wallet> = {
	FSManager: GetContractReturnType<ChainDefinitionsEntry["FSManager"]["abi"]>;
	FSFileRegistry: GetContractReturnType<
		ChainDefinitionsEntry["FSFileRegistry"]["abi"]
	>;
	FSKeyRegistry: GetContractReturnType<
		ChainDefinitionsEntry["FSKeyRegistry"]["abi"]
	>;
	FSEscrow: GetContractReturnType<ChainDefinitionsEntry["FSEscrow"]["abi"]>;
	$client: T;
};

function getKeyedClient<T extends Client | WalletClient>(client: T) {
	return {
		public: createPublicClient({
			transport: http(client.chain?.rpcUrls.default.http[0]),
		}),
		wallet: client,
	} as {
		public: PublicClient<Transport, ViemChain>;
		wallet: WalletClient<Transport, ViemChain, Account>;
	};
}

export function getContracts<T extends Wallet>(options: {
	client: T;
	chainKey: ChainKey;
}): FilosignContracts<T> {
	const { client, chainKey } = options;

	if (!client.transport || !client.chain || !client.account) {
		console.log(
			"Ensure client is properly initialized with transport, chain and account",
		);
	}

	const contractDefinitions = getDefinitionsEntry(chainKey);
	const bundledClient = getKeyedClient(client);

	return {
		FSManager: getContract({
			client: bundledClient,
			...contractDefinitions.FSManager,
		}),
		FSFileRegistry: getContract({
			client: bundledClient,
			...contractDefinitions.FSFileRegistry,
		}),
		FSKeyRegistry: getContract({
			client: bundledClient,
			...contractDefinitions.FSKeyRegistry,
		}),
		FSEscrow: getContract({
			client: bundledClient,
			...contractDefinitions.FSEscrow,
		}),
		$client: client,
	} as FilosignContracts<T>;
}
