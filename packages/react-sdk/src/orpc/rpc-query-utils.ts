import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "./app-router-types";

export function createFilosignRpcQueryUtils(client: AppRouterClient) {
	return createTanstackQueryUtils(client, { path: ["filosign"] });
}
