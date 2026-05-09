import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useFilosignContext } from "../../context/FilosignProvider";

interface SessionStoreOptions {
	seed: Uint8Array;
	expiresInHours?: number;
}

interface SessionStoreResult {
	sessionToken: string;
	expiresAt: string;
}

/**
 * Hook to store encrypted seed as a server-side session
 * Call this after PIN login with "Remember me" enabled
 */
export function useSessionStore() {
	const { api } = useFilosignContext();

	return useMutation<SessionStoreResult, Error, SessionStoreOptions>({
		mutationFn: async (options) => {
			if (!api) {
				throw new Error("API not initialized");
			}

			const response = await api.rpc.postSafe(
				{
					sessionToken: z.string(),
					expiresAt: z.string(),
				},
				"/auth/session",
				{
					seed: Array.from(options.seed),
					expiresInHours: options.expiresInHours ?? 24,
				},
			);

			// Store session token in localStorage for restoration on refresh
			if (response.data.sessionToken) {
				localStorage.setItem("fs_session_token", response.data.sessionToken);
			}

			return response.data;
		},
	});
}
