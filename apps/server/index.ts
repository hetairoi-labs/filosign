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
			origin: [
				env.FRONTEND_URL,
				"http://localhost:3001",
				"http://localhost:3000",
			],
			allowHeaders: ["Content-Type", "Authorization", "x-session-token"],
			allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
			credentials: true,
		}),
	)
	.use(async (c, next) => {
		c.header(
			"Content-Security-Policy",
			"default-src 'self'; " +
				"script-src 'self' 'unsafe-eval' 'unsafe-inline' https://waap.xyz https://*.waap.xyz; " +
				"style-src 'self' 'unsafe-inline'; " +
				"connect-src 'self' http://localhost:3000 http://127.0.0.1:3000 https://waap.xyz https://*.waap.xyz https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://sepolia.base.org https://mainnet.base.org https://rpc.ankr.com https://*.alchemy.com https://*.quiknode.pro https://api.zerocomputing.com https://*.holonym.io https://*.silkwallet.net https://*.silk-protector.com https://*.fly.dev; " +
				"img-src 'self' data: blob: https:; " +
				"font-src 'self' data:; " +
				"frame-src 'self' https://waap.xyz https://*.waap.xyz https://verify.walletconnect.com;",
		);
		await next();
	})
	.get("/", (c) => c.text("OK"))
	.route("/api", apiRouter);

export default {
	port: env.PORT || 30011,
	fetch: app.fetch,
};
