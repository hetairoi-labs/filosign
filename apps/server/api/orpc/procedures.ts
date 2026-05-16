import { ORPCError, os } from "@orpc/server";
import type { Address } from "viem";

import type { OrpcContext } from "./context";

/** Base builder; procedures share `OrpcContext` (@see https://orpc.dev/docs/getting-started) */
export const o = os.$context<OrpcContext>();

export const publicProcedure = o;

/** Requires `Authorization` Bearer that `optionalJwtWalletForOrpc` accepted (JWT set `userWallet` on context). */
export const authenticatedProcedure = publicProcedure.use(
	({ context, next }) => {
		const wallet = context.userWallet;
		if (!wallet) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Missing or invalid authorization",
			});
		}
		return next({
			context: {
				...context,
				userWallet: wallet as Address,
			},
		});
	},
);
