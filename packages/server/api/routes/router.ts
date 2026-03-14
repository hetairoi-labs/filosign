import type { ChainKey } from "@filosign/contracts";
import { Hono } from "hono";
import type { Chain } from "viem";
import config from "../../config";
import auth from "./auth";
import files from "./files";
import sharing from "./sharing";
import tx from "./tx";
import users from "./users";
import waitlist from "./waitlist";
import worldId from "./world-id";

type Runtime = {
	uptime: number;
	serverAddressSynapse: string;
	chain: Chain;
	chainKey: ChainKey;
};

export const apiRouter = new Hono()
	.get("/runtime", (ctx) => {
		const runtime: Runtime = {
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
	.route("/world-id", worldId);
