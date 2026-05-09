import { showRoutes } from "hono/dev";
import { app } from "..";

console.log(showRoutes(app, { verbose: true, colorize: true }));
