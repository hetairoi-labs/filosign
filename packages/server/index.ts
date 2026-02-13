import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { apiRouter } from "./api/routes/router";
import env from "./env";

//@ts-expect-error
BigInt.prototype.toJSON = function () {
	return this.toString();
};

export const app = new Hono()
	.use(logger())
	.use(
		cors({
			origin: env.FRONTEND_URL,
			allowHeaders: ["Content-Type", "Authorization"],
			allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
			credentials: true,
		}),
	)
	.route("/api", apiRouter);

export default {
	port: Bun.env.PORT ? parseInt(Bun.env.PORT, 10) : 30011,
	fetch: app.fetch,
};
