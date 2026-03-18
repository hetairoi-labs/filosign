import { useMutation, useQueryClient } from "@tanstack/react-query";
import { idb } from "../../../utils/idb";
import { useFilosignContext } from "../../context/FilosignProvider";

export function useLogout() {
	const { wallet } = useFilosignContext();
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ["fsM-logout"],
		mutationFn: async () => {
			if (!wallet) {
				throw new Error("No wallet available for logout");
			}

			const keyStore = idb({
				db: wallet.account.address,
				store: "fs-keystore",
			});
			keyStore.del("key-seed");
			queryClient.clear();
		},
	});
}
