import { useMemo } from "react";
import { useFilosignContext } from "../context/FilosignProvider";

export function useRuntimeChain() {
	const { contracts, ready } = useFilosignContext();

	const chain = useMemo(() => {
		if (!ready || !contracts) return null;
		return contracts.$client.chain;
	}, [ready, contracts]);

	return chain;
}
