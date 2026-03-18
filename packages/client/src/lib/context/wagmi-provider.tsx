import type { ConnectedWallet } from "@privy-io/react-auth";
import {
	createConfig,
	WagmiProvider as WagmiProviderBase,
} from "@privy-io/wagmi";
import type { HttpTransport } from "viem";
import { http } from "wagmi";
import { wagmiChains } from "@/src/constants";

declare module "wagmi" {
	interface Register {
		config: ReturnType<typeof createConfig>;
	}
}

export const config = createConfig({
	chains: wagmiChains,
	transports: wagmiChains.reduce(
		(acc, chain) => {
			acc[chain.id] = http();
			return acc;
		},
		{} as Record<number, HttpTransport>,
	),
});

function preferEmbeddedWallet({
	wallets,
}: {
	wallets: ConnectedWallet[];
}): ConnectedWallet | undefined {
	return wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
}

export function WagmiProvider({ children }: { children: React.ReactNode }) {
	return (
		<WagmiProviderBase
			config={config}
			setActiveWalletForWagmi={preferEmbeddedWallet}
		>
			{children}
		</WagmiProviderBase>
	);
}
