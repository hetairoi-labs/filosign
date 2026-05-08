import { PrivyProvider as PrivyProviderBase } from "@privy-io/react-auth";
import { defaultChain, privyChains } from "@/src/constants";

export function PrivyProvider({ children }: { children: React.ReactNode }) {
	if (!import.meta.env.VITE_PRIVY_APP_ID) {
		throw new Error("VITE_PRIVY_APP_ID is not set");
	}

	return (
		<PrivyProviderBase
			appId={import.meta.env.VITE_PRIVY_APP_ID}
			config={{
				defaultChain,
				supportedChains: privyChains,
				loginMethods: ["wallet", "google"],
				appearance: {
					theme: "light",
				},
				embeddedWallets: {
					ethereum: {
						createOnLogin: "users-without-wallets",
					},
				},
			}}
		>
			{children}
		</PrivyProviderBase>
	);
}
