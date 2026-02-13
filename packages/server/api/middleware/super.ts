import { createMiddleware } from "hono/factory";
import env from "@/env";
import { respond } from "@/lib/utils/respond";

export const superAuth = createMiddleware<{ Variables: { password: string } }>(
	async (c, next) => {
		const password = c.req.header("super");
		if (password !== env.SUPER_PASS) {
			return respond.err(c, "Unauthorized Super User", 401);
		}
		await next();
	},
);
