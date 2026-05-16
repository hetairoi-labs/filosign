import { ORPCError, os } from "@orpc/server";
import type { Address } from "viem";

import type { OrpcContext } from "./context";

export const o = os.$context<OrpcContext>();

export const publicProcedure = o;

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
