import type { getContracts } from "@filosign/contracts";
import type {
	Account,
	Chain,
	PublicClient,
	TransactionReceipt,
	Transport,
	WalletClient,
} from "viem";
import type { AppRouterClient } from "../src/orpc/app-router-types";
import type { FilosignSession } from "../src/orpc/create-orpc-client";
import type { FilosignStore } from "../store";

export type FilosignClientConfig = {
	debug?: boolean;
	apiBaseUrl: string;
	wallet: Wallet;
};

export type Wallet = WalletClient<Transport, Chain, Account>;

export type Defaults = {
	logger: unknown;
	rpc: AppRouterClient;
	session: FilosignSession;
	contracts: ReturnType<typeof getContracts<Wallet>>;
	publicClient: PublicClient;
	crypto: Crypto;
	wallet: Wallet;
	store: FilosignStore;
	tx: (txnPromise: Promise<`0x${string}`>) => Promise<TransactionReceipt>;

	//   store: FilosignStore;
	//   events: EventNotifier;
};
