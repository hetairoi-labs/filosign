import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { AppRouterClient } from "./app-router-types";

export function normalizeApiBaseUrl(apiBaseUrl: string) {
	return apiBaseUrl.replace(/\/+$/, "");
}

/** Mutable JWT holder read by {@link createFilosignOrpcClient} on each RPC request. */
export class FilosignSession {
	private token: string | null = null;

	setJwt(value: string | null | undefined) {
		if (value === null || value === undefined) {
			this.token = null;
			return;
		}
		this.token = value;
	}

	get jwtExists(): boolean {
		return this.token != null && this.token !== "";
	}

	ensureJwt() {
		if (!this.jwtExists) {
			throw new Error("JWT token is missing - user is not logged in");
		}
	}

	/** Value for `Authorization` header, or `undefined` when unauthenticated. */
	getAuthorizationValue(): string | undefined {
		if (!this.jwtExists) return undefined;
		return `Bearer ${this.token}`;
	}
}

/** Typed oRPC client: posts to `{apiBase}/api/rpc` with Bearer from `session`. */
export function createFilosignOrpcClient(
	apiBaseUrl: string,
	session: FilosignSession,
): AppRouterClient {
	const base = normalizeApiBaseUrl(apiBaseUrl);
	const link = new RPCLink({
		url: `${base}/api/rpc`,
		headers: async () => {
			const authorization = session.getAuthorizationValue();
			return authorization ? { Authorization: authorization } : {};
		},
	});
	return createORPCClient<AppRouterClient>(link);
}
