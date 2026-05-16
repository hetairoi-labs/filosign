import pino from "pino";
import env from "@/env";

/** Root logger for server + [@orpc/docs/integrations/pino](https://orpc.dev/docs/integrations/pino) `LoggingHandlerPlugin`. */
export const logger = pino({
	level: env.DEBUG ? "debug" : "info",
});
