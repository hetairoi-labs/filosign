import { Hono } from "hono";
import { optionalJwtWalletForOrpc } from "@/api/middleware/orpc-auth";
import type { ApiRouterVariables } from "@/api/orpc/context";
import { orpcHybridMiddleware } from "@/api/orpc/hono-mount";

export const apiRouter = new Hono<{ Variables: ApiRouterVariables }>()
	.use("*", optionalJwtWalletForOrpc)
	.use("*", orpcHybridMiddleware);
