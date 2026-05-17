import { createRequire } from "node:module";
import pino from "pino";
import env from "@/env";

const level = env.DEBUG ? "debug" : "info";
const require = createRequire(import.meta.url);

/** Bun compile cannot use top-level await; pino-pretty is dev-only (not in Docker/release). */
function buildLogger(): pino.Logger {
	if (env.CHAIN === "local") {
		try {
			// eslint-disable-next-line @typescript-eslint/no-require-imports -- dev-only, not bundled in compile
			const pretty = require("pino-pretty");
			return pino(
				{ level },
				pretty({
					colorize: true,
					translateTime: "HH:MM:ss",
					ignore: "pid,hostname",
				}),
			);
		} catch {
			// pino-pretty unavailable outside dev install
		}
	}
	return pino({ level });
}

/** Root logger — oRPC `LoggingHandlerPlugin` + HTTP request middleware. */
export const logger = buildLogger();
