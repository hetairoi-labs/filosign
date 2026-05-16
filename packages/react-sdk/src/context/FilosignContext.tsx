import type { ChainKey, FilosignContracts } from "@filosign/contracts";
import type { signatures } from "@filosign/crypto-utils";
import { createContext } from "react";
import type { UseWalletClientReturnType } from "wagmi";
import type { AppRouterClient } from "../orpc/app-router-types";
import type { FilosignSession } from "../orpc/create-orpc-client";
import type { createFilosignRpcQueryUtils } from "../orpc/rpc-query-utils";

type Wallet = UseWalletClientReturnType["data"] | undefined;
type DilithiumInstance = Parameters<typeof signatures.keyGen>[0]["dl"];

export type FilosignRpcQueryUtils = ReturnType<
	typeof createFilosignRpcQueryUtils
>;

export type FilosignContextValue = {
	ready: boolean;
	/** Base URL for the platform API (e.g. `VITE_PLATFORM_URL`), no trailing slash. */
	apiBaseUrl: string;
	rpc: AppRouterClient;
	rpcQuery: FilosignRpcQueryUtils;
	session: FilosignSession;
	wallet: Wallet;
	contracts: FilosignContracts | null;
	runtime: Runtime;
	wasm: {
		dilithium: DilithiumInstance;
	};
};

export type Runtime = {
	uptime: number;
	/** Serialized chain config from `/api/rpc` runtime (shape may vary by deployment). */
	chain: unknown;
	chainKey: ChainKey;
	serverAddressSynapse: string;
	platformFeeBps: number;
	maxPlatformFeeBps: number;
	treasury: string;
};

export const FilosignContext = createContext<FilosignContextValue>({
	ready: false,
	apiBaseUrl: "",
	rpc: {} as AppRouterClient,
	rpcQuery: {} as FilosignRpcQueryUtils,
	session: {} as FilosignSession,
	wallet: undefined,
	contracts: null,
	runtime: {} as Runtime,
	wasm: {
		dilithium: {} as DilithiumInstance,
	},
});
