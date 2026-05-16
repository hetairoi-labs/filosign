import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { MINUTE } from "../../constants";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useAuthedApi } from "../auth/useAuthedApi";

export type SentFileRow =
	InferClientOutputs<AppRouterClient>["files"]["list"]["sent"]["files"][number];

export function useSentFiles() {
	const { data: auth } = useAuthedApi();

	return useQuery({
		queryKey: ["sent-files"],
		queryFn: async () => {
			if (!auth) throw new Error("API is unreachable");
			const raw = await auth.rpc.files.list.sent();
			return raw.files;
		},
		enabled: !!auth,
		staleTime: 5 * MINUTE,
	});
}
