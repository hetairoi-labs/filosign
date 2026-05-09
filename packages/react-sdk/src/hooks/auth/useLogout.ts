import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { clearSessionSeed } from "./session-seed";
import { clearSessionToken } from "./useSessionRestore";

export function useLogout() {
	const { wallet } = useFilosignContext();
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ["fsM-logout"],
		mutationFn: async () => {
			if (!wallet) {
				throw new Error("No wallet available for logout");
			}

			// Clear both memory session and server session token
			clearSessionSeed(wallet.account.address);
			clearSessionToken();

			queryClient.invalidateQueries({
				queryKey: ["fsQ-is-logged-in", wallet?.account.address],
			});
			queryClient.invalidateQueries();
			queryClient.refetchQueries();
		},
	});
}
