import { type FilosignContracts, getContracts } from "@filosign/contracts";
import type { signatures } from "@filosign/crypto-utils";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import type { UseWalletClientReturnType } from "wagmi";
import ApiClient from "../ApiClient";
import { MINUTE } from "../constants";
import {
	FilosignContext,
	type FilosignContextValue,
	type Runtime,
} from "./FilosignContext";

type Wallet = UseWalletClientReturnType["data"];
type DilithiumInstance = Parameters<typeof signatures.keyGen>[0]["dl"];

type FilosignConfig = {
	children: ReactNode;
	apiBaseUrl: string;
	wallet: Wallet | undefined;
	wasm: {
		dilithium: DilithiumInstance;
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

	useEffect(() => {
		if (!wallet || !runtime.data) {
			setContracts(null);
			return;
		}

		const fsContracts = getContracts({
			client: wallet,
			chainKey: runtime.data.chainKey,
		});
		setContracts(fsContracts);
	}, [runtime.data, wallet]);

	const value: FilosignContextValue = useMemo(
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
