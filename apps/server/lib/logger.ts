import pino from "pino";
import env from "@/env";

const level = env.DEBUG ? "debug" : "info";

/** Bun can't resolve `transport.target` workers for devDependencies — use a stream in local dev. */
async function createLogger() {
	if (env.CHAIN === "local") {
		const pretty = (await import("pino-pretty")).default;
		return pino(
			{ level },
			pretty({
				colorize: true,
				translateTime: "HH:MM:ss",
				ignore: "pid,hostname",
			}),
		);
	}
	return pino({ level });
}

/** Root logger — oRPC `LoggingHandlerPlugin` + HTTP request middleware. */
export const logger = await createLogger();
