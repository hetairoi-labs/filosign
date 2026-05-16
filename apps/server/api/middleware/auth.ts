import { eq } from "drizzle-orm";
import { honoAuthenticated } from "@/api/factory";
import env from "@/env";
import db from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyJwt } from "@/lib/utils/jwt";
import { respond } from "@/lib/utils/respond";
import tryCatchSync, { tryCatch } from "@/lib/utils/tryCatch";

export const authenticated = honoAuthenticated.createMiddleware(
	async (ctx, next) => {
		const authHeader = ctx.req.header("Authorization");

		if (!authHeader?.startsWith("Bearer ")) {
			return respond.err(ctx, "Missing or invalid authorization header", 401);
		}

		const token = authHeader.substring(7);

		const result = tryCatchSync(() => verifyJwt(token));

		if (result.error) {
			const error =
				result.error instanceof Error
					? result.error.message
					: String(result.error);
			if (env.DEBUG) {
				console.error("JWT verification failed:", {
					error,
					tokenPrefix: `${token.substring(0, 20)}…`,
					authHeaderPrefix: `${authHeader.substring(0, 50)}…`,
				});
			} else {
				console.error("JWT verification failed:", { error });
			}
			return respond.err(ctx, "Invalid token format", 401);
		}

		const payload = result.data;
		if (!payload?.sub) {
			console.error("JWT verification returned invalid payload:", { payload });
			return respond.err(ctx, "Invalid or expired token", 401);
		}

		const touchRes = await tryCatch(
			db
				.update(users)
				.set({ lastActiveAt: new Date() })
				.where(eq(users.walletAddress, payload.sub)),
		);
		if (touchRes.error) {
			console.error("[auth] lastActiveAt touch failed:", {
				walletHint: `${payload.sub.slice(0, 6)}…${payload.sub.slice(-4)}`,
				error:
					touchRes.error instanceof Error
						? touchRes.error.message
						: String(touchRes.error),
			});
		}

		ctx.set("userWallet", payload.sub);
		await next();
	},
);
