import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { DAY } from "../../constants";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type EntitlementsSnapshot =
	InferClientOutputs<AppRouterClient>["billing"]["entitlements"];

export function useEntitlements() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useQuery({
		...rpcQuery.billing.entitlements.queryOptions(),
		enabled: isAuthed,
		staleTime: 1 * DAY,
	});
}
