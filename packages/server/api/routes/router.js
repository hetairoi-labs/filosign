import { Hono } from "hono";
import config from "../../config";
import auth from "./auth";
import files from "./files";
import payments from "./payments";
import sharing from "./sharing";
import tx from "./tx";
import users from "./users";
import waitlist from "./waitlist";
import worldId from "./world-id";
export const apiRouter = new Hono()
    .get("/runtime", (ctx) => {
    const runtime = {
        uptime: process.uptime(),
        serverAddressSynapse: config.serverAddressSynapse,
        chain: config.runtimeChain,
        chainKey: config.chainKey,
    };
    return ctx.json(runtime);
})
    .route("/auth", auth)
    .route("/files", files)
    .route("/sharing", sharing)
    .route("/users", users)
    .route("/tx", tx)
    .route("/waitlist", waitlist)
    .route("/world-id", worldId)
    .route("/payments", payments);
