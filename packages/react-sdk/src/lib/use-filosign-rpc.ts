import { useFilosignContext } from "../context/useFilosignContext";
import { useAuthedApi } from "../hooks/auth/useAuthedApi";

/**
 * Filosign RPC client, oRPC TanStack helpers (`rpcQuery`), and JWT session gate.
 * Use `rpcQuery.*.queryOptions()` / `mutationOptions()` for API calls; gate with `isAuthed`.
 */
export function useFilosignRpc() {
	const { rpc, rpcQuery } = useFilosignContext();
	const authedQuery = useAuthedApi();

	return {
		rpc,
		rpcQuery,
		auth: authedQuery.data,
		isAuthed: !!authedQuery.data,
		authedQuery,
	};
}
