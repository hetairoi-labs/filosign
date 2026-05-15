import type { ChainKey } from "@filosign/contracts";
import { Hono } from "hono";
import type { Address, Chain } from "viem";
import { fsContracts } from "@/lib/evm";
import config from "../../config";
import auth from "./auth";
import files from "./files";
import sharing from "./sharing";
import tx from "./tx";
import users from "./users";

type Runtime = {
	uptime: number;
	serverAddressSynapse: string;
	chain: Chain;
	chainKey: ChainKey;
	platformFeeBps: number;
	maxPlatformFeeBps: number;
	treasury: Address;
};

export const apiRouter = new Hono()
	.get("/runtime", async (ctx) => {
		const [platformFeeBps, maxPlatformFeeBps, treasury] = await Promise.all([
			fsContracts.FSManager.read.platformFeeBps(),
			fsContracts.FSManager.read.MAX_PLATFORM_FEE_BPS(),
			fsContracts.FSManager.read.treasury(),
		]);
		const runtime: Runtime = {
			uptime: process.uptime(),
			serverAddressSynapse: config.serverAddressSynapse,
			chain: config.runtimeChain,
			chainKey: config.chainKey,
			platformFeeBps: Number(platformFeeBps),
			maxPlatformFeeBps: Number(maxPlatformFeeBps),
			treasury,
		};
		return ctx.json(runtime);
	})
	.route("/auth", auth)
	.route("/files", files)
	.route("/sharing", sharing)
	.route("/users", users)
	.route("/tx", tx);
