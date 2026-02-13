import { type FilosignContracts, getContracts } from "@filosign/contracts";
import { useQuery } from "@tanstack/react-query";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Chain } from "viem";
import type { UseWalletClientReturnType } from "wagmi";
import ApiClient from "../ApiClient";
import { MINUTE } from "../constants";

type Wallet = UseWalletClientReturnType["data"];

type FilosignContext = {
	ready: boolean;
	api: ApiClient;
	wallet: Wallet;
	contracts: FilosignContracts | null;
	runtime: Runtime;
	wasm: {
		// biome-ignore lint/suspicious/noExplicitAny: pata nahi bhai, maa chudaa rha tha
		dilithium: any;
	};
};

const FilosignContext = createContext<FilosignContext>({
	ready: false,
	api: {} as ApiClient,
	wallet: undefined,
	contracts: null,
	runtime: {} as Runtime,
	wasm: {
		dilithium: undefined,
	},
});

type FilosignConfig = {
	children: ReactNode;
	apiBaseUrl: string;
	wallet: Wallet | undefined;
	wasm: {
		dilithium: unknown;
	};
	loader?: React.ComponentType<{ text?: string }>;
};

export function FilosignProvider(props: FilosignConfig) {
	const { children, apiBaseUrl, wallet, wasm } = props;

	const [contracts, setContracts] = useState<FilosignContracts | null>(null);

	const api = useMemo(() => new ApiClient(apiBaseUrl), [apiBaseUrl]);

	const runtime = useQuery({
		queryKey: ["runtime", apiBaseUrl],
		queryFn: async () => {
			const response = await api.rpc.base.get("/runtime");
			const data = await response.data;
			if (!data) throw new Error("Failed to fetch runtime");
			return data;
		},
		staleTime: 5 * MINUTE,

		enabled: !!api,
	});

	const flag = useRef(false);

	useEffect(() => {
		if (!flag.current && wallet && runtime.data) {
			flag.current = true;
			const fsContracts = getContracts({
				client: wallet,
				chainId: runtime.data.chain.id,
			});
			setContracts(fsContracts);
		}
	}, [runtime.data, wallet]);

	const value: FilosignContext = useMemo(
		() => ({
			ready: !!api && !!runtime.data,
			wallet: wallet,
			api: api as ApiClient,
			contracts,
			wasm: { dilithium: wasm.dilithium },
			runtime: runtime.data || ({} as Runtime),
		}),
		[api, wallet, contracts, wasm, runtime.data],
	);

	// if (!runtime.data) {
	// 	if (LoaderComponent) {
	// 		return <LoaderComponent />;
	// 	}
	// 	return <>Runtime Loading...</>;
	// }

	// if (!contracts) {
	// 	console.log("contracts", contracts);
	// 	if (LoaderComponent) {
	// 		return <LoaderComponent />;
	// 	}
	// 	return <>Not Ready...</>;
	// }

	return (
		<FilosignContext.Provider value={value}>
			{children}
		</FilosignContext.Provider>
	);
}

export function useFilosignContext() {
	return useContext(FilosignContext);
}

type Runtime = {
	uptime: number;
	chain: Chain;
	serverAddressSynapse: string;
};
