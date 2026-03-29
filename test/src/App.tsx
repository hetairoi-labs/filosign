import { FilosignProvider, useFilosignContext } from "@filosign/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat, worldchain, worldchainSepolia } from "viem/chains";
import Test from "./Test.js";

const raw = import.meta.env.VITE_CHAIN;
if (!raw || typeof raw !== "string") {
	throw new Error(
		"VITE_CHAIN is required. Set it to local, testnet, or mainnet (e.g. VITE_CHAIN=testnet bun run dev)",
	);
}
const chainKey = raw as "local" | "testnet" | "mainnet";
if (chainKey !== "local" && chainKey !== "testnet" && chainKey !== "mainnet") {
	throw new Error(
		`Invalid VITE_CHAIN="${raw}". Must be one of: local, testnet, mainnet`,
	);
}
const chain =
	chainKey === "testnet"
		? worldchainSepolia
		: chainKey === "mainnet"
			? worldchain
			: hardhat;
const transport = http();

export const wallet1 = createWalletClient({
	chain,
	transport,
	account: privateKeyToAccount(
		"0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
	),
});

export const wallet2 = createWalletClient({
	chain,
	transport,
	account: privateKeyToAccount(
		"0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
	),
});

const queryClient1 = new QueryClient();
const queryClient2 = new QueryClient();

export function useCurrentWalletAddress() {
	const { wallet } = useFilosignContext();
	if (!wallet) throw new Error("No wallet in context");
	return wallet.account.address;
}

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

import dilithiumPromise from "dilithium-crystals-js";

function App() {
	const [dilithium, setDilithium] = useState<unknown>(null);

	useEffect(() => {
		let mounted = true;
		dilithiumPromise
			.then((dil) => {
				if (mounted) setDilithium(dil);
			})
			.catch((err) => {
				console.error("Failed to init Dilithium:", err);
			});
		return () => {
			mounted = false;
		};
	}, []);

	if (!dilithium) {
		return (
			<div className="flex items-center justify-center bg-background min-h-screen">
				<div className="flex flex-col items-center gap-4">
					<div className="size-8 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin" />
					<p className="text-sm text-muted-foreground">Initializing...</p>
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
