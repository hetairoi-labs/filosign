import {
	type Account,
	type Chain,
	type Client,
	createPublicClient,
	getContract,
	http,
	type PublicClient,
	type Transport,
	toHex,
	type WalletClient,
} from "viem";
import { definitions } from "../definitions/index";

function getKeyedClient<T extends Client | WalletClient>(client: T) {
	return {
		public: createPublicClient({
			transport: http(client.chain?.rpcUrls.default.http[0]),
		}),
		wallet: client,
	} as {
		public: PublicClient<Transport, Chain>;
		wallet: WalletClient<Transport, Chain, Account>;
	};
}

export function getContracts<T extends Wallet>(options: {
	client: T;
	chainId: number;
}) {
	const { client, chainId } = options;

	if (!client.transport || !client.chain || !client.account) {
		console.log(
			"Ensure client is properly initialized with transport, chain and account",
		);
	}

	const key = toHex(chainId);
	if (!Object.keys(definitions).includes(key)) {
		console.error(`No contract definitions found for chainId ${chainId}`);
		throw new Error(`Unsupported chainId: ${chainId}`);
	}

	const contractDefinitions = definitions[key as keyof typeof definitions];

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
		FSWorldVerifier: getContract({
			client: getKeyedClient(client),
			...contractDefinitions.FSWorldVerifier,
		}),
		$client: client,
	};
}

export type FilosignContracts = ReturnType<typeof getContracts>;

type Wallet = WalletClient<Transport, Chain, Account>;
