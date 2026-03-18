import { useChainId, useSwitchChain } from "wagmi";
import { defaultChain } from "@/src/constants";

export function useSwitchNetwork() {
	const chainId = useChainId();
	const { switchChain, isPending } = useSwitchChain();
	const isWrongChain = chainId !== defaultChain.id;

	const switchToDefaultChain = () => {
		if (isWrongChain) {
			switchChain({ chainId: defaultChain.id });
		}
	};

	return {
		isWrongChain,
		switchToDefaultChain,
		isSwitching: isPending,
	};
}
