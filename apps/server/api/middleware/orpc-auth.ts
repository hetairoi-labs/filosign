import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import type { Address } from "viem";
import env from "@/env";
import db from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyJwt } from "@/lib/utils/jwt";
import { respond } from "@/lib/utils/respond";
import tryCatchSync, { tryCatch } from "@/lib/utils/tryCatch";

const ORPC_PATH_PREFIXES = ["/api/rpc", "/api/api-reference"] as const;

function touchesOrpcUrls(pathname: string) {
	return ORPC_PATH_PREFIXES.some(
		(p) => pathname === p || pathname.startsWith(`${p}/`),
	);
}

/**
 * Sets `userWallet` when Authorization is valid (mirrors authenticated touch behavior).
 * Only runs on oRPC/OpenAPI-reference paths so other /api routes keep existing semantics.
 */
export async function optionalJwtWalletForOrpc(c: Context, next: Next) {
	const pathname = new URL(c.req.url).pathname;
	if (!touchesOrpcUrls(pathname)) return next();

	const authHeader = c.req.header("Authorization");
	if (!authHeader?.startsWith("Bearer ")) return next();

	const token = authHeader.slice(7);
	const verified = tryCatchSync(() => verifyJwt(token));
	if (verified.error) {
		if (env.DEBUG) {
			console.error("[orpc-auth] JWT verify failed:", verified.error);
		}
		return respond.err(c, "Invalid token format", 401);
	}
	const payload = verified.data;
	if (!payload?.sub) {
		return respond.err(c, "Invalid or expired token", 401);
	}

	const touchRes = await tryCatch(
		db
			.update(users)
			.set({ lastActiveAt: new Date() })
			.where(eq(users.walletAddress, payload.sub)),
	);
	if (touchRes.error) {
		console.error("[orpc-auth] lastActiveAt touch failed:", {
			walletHint: `${payload.sub.slice(0, 6)}…${payload.sub.slice(-4)}`,
			error:
				touchRes.error instanceof Error
					? touchRes.error.message
					: String(touchRes.error),
		});
	}

	c.set("userWallet", payload.sub as Address);
	return next();
}
