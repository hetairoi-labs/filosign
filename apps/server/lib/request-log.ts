import type { MiddlewareHandler } from "hono";
import { logger } from "@/lib/logger";

/** Log every HTTP request with pino (replaces `hono/logger`). */
export const requestLog: MiddlewareHandler = async (c, next) => {
	const start = performance.now();
	await next();
	const ms = Math.round(performance.now() - start);
	logger.info(`${c.req.method} ${c.req.path} ${c.res.status} ${ms}ms`);
};
