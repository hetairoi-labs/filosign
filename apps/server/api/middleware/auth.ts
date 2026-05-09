import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import type { Address } from "viem";
import db from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyJwt } from "@/lib/utils/jwt";
import { respond } from "@/lib/utils/respond";
import tryCatchSync from "@/lib/utils/tryCatch";

export const authenticated = createMiddleware<{
	Variables: {
		userWallet: Address;
	};
}>(async (ctx, next) => {
	const authHeader = ctx.req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return respond.err(ctx, "Missing or invalid authorization header", 401);
	}

	const token = authHeader.substring(7); // Remove "Bearer " prefix

	const result = tryCatchSync(() => verifyJwt(token));

	if (result.error) {
		console.error("JWT verification failed:", {
			error:
				result.error instanceof Error
					? result.error.message
					: String(result.error),
			token: `${token.substring(0, 20)}...`, // Log partial token for debugging
			authHeader: `${authHeader.substring(0, 50)}...`, // Log partial header
		});
		return respond.err(ctx, "Invalid token format", 401);
	}

	const payload = result.data;
	if (!payload || !payload.sub) {
		console.error("JWT verification returned invalid payload:", { payload });
		return respond.err(ctx, "Invalid or expired token", 401);
	}

	ctx.set("userWallet", payload.sub);
	await next();
	//TODO see if this can be done without awaiting
	await db
		.update(users)
		.set({ lastActiveAt: new Date() })
		.where(eq(users.walletAddress, payload.sub));
});
