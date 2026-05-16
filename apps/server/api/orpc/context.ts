import type { LoggerContext } from "@orpc/experimental-pino";
import type { Context as HonoContext } from "hono";
import type { Address } from "viem";

/** `apiRouter` variables used by oRPC context (optional wallet when JWT present on /api/rpc). */
export type ApiRouterVariables = {
	userWallet?: Address;
};

/** Per-request context for oRPC procedures (incl. Pino bridge from `LoggingHandlerPlugin`). */
export type OrpcContext = LoggerContext & {
	hono: HonoContext<{ Variables: ApiRouterVariables }>;
	userWallet?: Address;
};

export type CreateContextOptions = {
	context: HonoContext<{ Variables: ApiRouterVariables }>;
};

export async function createContext({
	context,
}: CreateContextOptions): Promise<OrpcContext> {
	return {
		hono: context,
		userWallet: context.get("userWallet"),
	};
}
