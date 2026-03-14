import { PrivyProvider as PrivyProviderBase } from "@privy-io/react-auth";
import { defaultChain, privyChains } from "@/src/constants";

export function PrivyProvider({ children }: { children: React.ReactNode }) {
	if (!process.env.BUN_PUBLIC_PRIVY_APP_ID) {
		throw new Error("BUN_PUBLIC_PRIVY_APP_ID is not set");
	}

	return (
		<PrivyProviderBase
			appId={process.env.BUN_PUBLIC_PRIVY_APP_ID}
			config={{
				defaultChain,
				supportedChains: privyChains,
				loginMethods: ["wallet", "google", "twitter", "github", "discord"],
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
