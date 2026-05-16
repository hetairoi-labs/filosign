import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useAuthedApi } from "../auth/useAuthedApi";

export type ReceivedFileRow =
	InferClientOutputs<AppRouterClient>["files"]["list"]["received"]["files"][number];

export function useReceivedFiles() {
	const { data: auth } = useAuthedApi();

	return useQuery({
		queryKey: ["received-files"],
		queryFn: async () => {
			if (!auth) throw new Error("API is unreachable");
			const raw = await auth.rpc.files.list.received();
			return raw.files;
		},
		enabled: !!auth,
	});
}
