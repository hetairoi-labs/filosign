import type { MiddlewareHandler } from "hono";
import { logger } from "@/lib/logger";

/** Log every HTTP request with pino (replaces `hono/logger`). */
export const requestLog: MiddlewareHandler = async (c, next) => {
	const start = performance.now();
	await next();
	logger.info(
		{
			req: {
				method: c.req.method,
				path: c.req.path,
				url: c.req.url,
			},
			res: { status: c.res.status },
			responseTime: Math.round(performance.now() - start),
		},
		"request handled",
	);
};
