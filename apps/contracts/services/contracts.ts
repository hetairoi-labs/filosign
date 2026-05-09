import {
	type Account,
	type Client,
	createPublicClient,
	getContract,
	http,
	type PublicClient,
	type Transport,
	type Chain as ViemChain,
	type WalletClient,
} from "viem";
import { type ChainKey, getDefinitionsEntry } from "../definitions/index";

export type { ChainKey } from "../definitions/index";

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
}) {
	const { client, chainKey } = options;

	if (!client.transport || !client.chain || !client.account) {
		console.log(
			"Ensure client is properly initialized with transport, chain and account",
		);
	}

	const contractDefinitions = getDefinitionsEntry(chainKey);

	return {
		FSManager: getContract({
			client: getKeyedClient(client),
			...contractDefinitions.FSManager,
		}),
		FSFileRegistry: getContract({
			client: getKeyedClient(client),
			...contractDefinitions.FSFileRegistry,
		}),
		FSKeyRegistry: getContract({
			client: getKeyedClient(client),
			...contractDefinitions.FSKeyRegistry,
		}),
		FSEscrow: getContract({
			client: getKeyedClient(client),
			...contractDefinitions.FSEscrow,
		}),
		$client: client,
	};
}

export type FilosignContracts = ReturnType<typeof getContracts>;

type Wallet = WalletClient<Transport, ViemChain, Account>;
