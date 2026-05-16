import { Hono } from "hono";
import { optionalJwtWalletForOrpc } from "@/api/middleware/orpc-auth";
import type { ApiRouterVariables } from "@/api/orpc/context";
import { orpcHybridMiddleware } from "@/api/orpc/hono-mount";
import { loadPlatformRuntime } from "@/lib/domain/platform-runtime";
import { respond } from "@/lib/utils/respond";
import users from "./users";

export const apiRouter = new Hono<{ Variables: ApiRouterVariables }>()
	.use("*", optionalJwtWalletForOrpc)
	.use("*", orpcHybridMiddleware)
	.get("/runtime", async (ctx) => {
		const runtime = await loadPlatformRuntime();
		return respond.ok(ctx, runtime, "Runtime", 200);
	})
	.route("/users", users);
