import { PrivyProvider as PrivyProviderBase } from "@privy-io/react-auth";
import { defaultChain, privyChains } from "@/src/constants";
import env from "@/src/env";

export function PrivyProvider({ children }: { children: React.ReactNode }) {
	return (
		<PrivyProviderBase
			appId={env.VITE_PRIVY_APP_ID}
			config={{
				defaultChain,
				supportedChains: privyChains,
				loginMethods: ["email", "google"],
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
