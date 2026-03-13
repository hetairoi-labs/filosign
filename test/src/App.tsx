import { FilosignProvider, useFilosignContext } from "@filosign/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import Test from "./Test.js";

const wallet1 = createWalletClient({
	chain: hardhat,
	transport: http(),
	account: privateKeyToAccount(
		"0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
	),
});

const wallet2 = createWalletClient({
	chain: hardhat,
	transport: http(),
	account: privateKeyToAccount(
		"0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
	),
});

const queryClient1 = new QueryClient();
const queryClient2 = new QueryClient();

export function useOtherAddress() {
	const { wallet } = useFilosignContext();
	if (!wallet) throw new Error("No wallet in context");
	if (wallet.account.address === wallet1.account.address) {
		return wallet2.account.address;
	} else {
		return wallet1.account.address;
	}
}

export function useSelfReload() {
	const { wallet } = useFilosignContext();

	const selfClient =
		wallet?.account.address === wallet1.account.address
			? queryClient1
			: queryClient2;

	return {
		reload: () => {
			selfClient.invalidateQueries();
			selfClient.refetchQueries();
		},
	};
}

export function useOtherReload() {
	const { wallet } = useFilosignContext();

	const otherClient =
		wallet?.account.address === wallet1.account.address
			? queryClient2
			: queryClient1;

	return {
		reload: () => {
			otherClient.invalidateQueries();
			otherClient.refetchQueries();
		},
	};
}

// Singleton: Emscripten FS can only init once. React Strict Mode double-mounts,
// causing "File exists" when createDefaultDevices runs a second time.
let dilithiumPromise: Promise<unknown> | null = null;

function initDilithium() {
	if (dilithiumPromise) return dilithiumPromise;
	dilithiumPromise = (async () => {
		// Mock chrome for the dilithium library
		(globalThis as any).chrome = {
			runtime: {
				getURL: () => "/dilithium.wasm",
			},
		};

		// Provide arguments object for dilithium library (needed for Emscripten)
		(globalThis as any).arguments = (globalThis as any).arguments || [];

		const { createDilithium } = await import("./dilithium.min.js");
		return createDilithium();
	})();
	return dilithiumPromise;
}

function App() {
	const [dilithium, setDilithium] = useState<unknown>(null);

	useEffect(() => {
		let mounted = true;
		initDilithium()
			.then((dil) => {
				if (mounted) setDilithium(dil);
			})
			.catch((err: unknown) => {
				console.error("Failed to init Dilithium:", err);
			});
		return () => {
			mounted = false;
		};
	}, []);

	if (!dilithium) {
		return (
			<div className="flex items-center justify-center bg-background">
				<div className="text-center">
					<p className="text-xl font-semibold">
						Initializing Dilithium WASM...
					</p>
					<p className="text-sm text-muted-foreground mt-2">Please wait...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex divide-x-2 divide-border bg-background min-h-screen">
			<main>
				<QueryClientProvider client={queryClient1}>
					<FilosignProvider
						wallet={wallet1}
						apiBaseUrl="http://localhost:30011/api"
						wasm={{ dilithium }}
					>
						<Test />
					</FilosignProvider>
				</QueryClientProvider>
			</main>
			<main>
				<QueryClientProvider client={queryClient2}>
					<FilosignProvider
						wallet={wallet2}
						apiBaseUrl="http://localhost:30011/api"
						wasm={{ dilithium }}
					>
						<Test />
					</FilosignProvider>
				</QueryClientProvider>
			</main>
		</div>
	);
}

export default App;
