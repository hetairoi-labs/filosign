import { createRequire } from "node:module";
import pino from "pino";
import env from "@/env";

const level = env.DEBUG ? "debug" : "info";
const require = createRequire(import.meta.url);

function buildLogger(): pino.Logger {
	if (env.CHAIN === "local") {
		try {
			const pretty = require("pino-pretty");
			return pino(
				{ level },
				pretty({
					colorize: true,
					translateTime: "HH:MM:ss",
					ignore: "pid,hostname",
					singleLine: true,
				}),
			);
		} catch {
			// best effort
		}
	}
	return pino({ level });
}

export const logger = buildLogger();
