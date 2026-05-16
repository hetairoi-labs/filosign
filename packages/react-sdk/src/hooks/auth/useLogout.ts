import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { filosignKeys } from "../../lib/query-keys";
import { clearSessionSeed } from "./session-seed";

export function useLogout() {
	const { wallet, session } = useFilosignContext();
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ["fsM-logout"],
		mutationFn: async () => {
			if (!wallet) {
				throw new Error("No wallet available for logout");
			}

			clearSessionSeed(wallet.account.address);
			session.setJwt(null);

			queryClient.invalidateQueries({
				queryKey: filosignKeys.isLoggedIn(wallet?.account.address),
			});
			queryClient.invalidateQueries();
			queryClient.refetchQueries();
		},
	});
}
