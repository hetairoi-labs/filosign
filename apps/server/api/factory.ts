import { createFactory } from "hono/factory";
import type { Address } from "viem";

/**
 * Typed Hono Env for routes using `authenticated` middleware.
 * [@hono docs — Factory helper](https://hono.dev/docs/helpers/factory)
 */
export type AuthenticatedVariables = {
	userWallet: Address;
};

export const honoAuthenticated = createFactory<{
	Variables: AuthenticatedVariables;
}>();
