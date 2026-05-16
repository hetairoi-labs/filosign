import "./lib/polyfills/bigint-json";
import { Hono } from "hono";
import { cors } from "hono/cors";
import config from "@/config";
import { csp } from "@/lib/csp";
import { requestLog } from "@/lib/request-log";
import { apiRouter } from "./api/routes/router";

export const app = new Hono()
	.use(requestLog)
	.use(cors(config.http.cors))
	.use(csp)
	.get("/", (c) => c.text("OK"))
	.get("/health", (c) => c.json({ ok: true }))
	.route("/api", apiRouter);

export default {
	port: config.http.port,
	fetch: app.fetch,
};
