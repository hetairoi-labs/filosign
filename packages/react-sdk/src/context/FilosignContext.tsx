import type { ChainKey, FilosignContracts } from "@filosign/contracts";
import type { signatures } from "@filosign/crypto-utils";
import { createContext } from "react";
import type { Chain } from "viem";
import type { UseWalletClientReturnType } from "wagmi";
import type ApiClient from "../ApiClient";

type Wallet = UseWalletClientReturnType["data"];
type DilithiumInstance = Parameters<typeof signatures.keyGen>[0]["dl"];

export type FilosignContextValue = {
	ready: boolean;
	api: ApiClient;
	wallet: Wallet;
	contracts: FilosignContracts | null;
	runtime: Runtime;
	wasm: {
		dilithium: DilithiumInstance;
	};
};

export type Runtime = {
	uptime: number;
	chain: Chain;
	chainKey: ChainKey;
	serverAddressSynapse: string;
};

export const FilosignContext = createContext<FilosignContextValue>({
	ready: false,
	api: {} as ApiClient,
	wallet: undefined,
	contracts: null,
	runtime: {} as Runtime,
	wasm: {
		dilithium: {} as DilithiumInstance,
	},
});
