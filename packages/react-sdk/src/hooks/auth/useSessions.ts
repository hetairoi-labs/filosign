import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useFilosignContext } from "../../context/FilosignProvider";
import { clearSessionSeed } from "./session-seed";
import { clearSessionToken } from "./useSessionRestore";

interface Session {
	id: string;
	createdAt: string;
	expiresAt: string;
	lastUsedAt: string;
	ipAddress: string | null;
	userAgent: string | null;
}

/**
 * Hook to list all active sessions for the current user
 */
export function useSessions() {
	const { api } = useFilosignContext();

	return useQuery<{ sessions: Session[] }, Error>({
		queryKey: ["fsQ-sessions"],
		queryFn: async () => {
			if (!api) {
				throw new Error("API not initialized");
			}

			const response = await api.rpc.getSafe(
				{
					sessions: z.array(
						z.object({
							id: z.string(),
							createdAt: z.string(),
							expiresAt: z.string(),
							lastUsedAt: z.string(),
							ipAddress: z.string().nullable(),
							userAgent: z.string().nullable(),
						}),
					),
				},
				"/auth/sessions",
			);

			return response.data;
		},
		enabled: !!api,
	});
}

/**
 * Hook to revoke the current session (logout)
 */
export function useRevokeSession() {
	const { api } = useFilosignContext();
	const queryClient = useQueryClient();

	return useMutation<void, Error>({
		mutationFn: async () => {
			if (!api) {
				throw new Error("API not initialized");
			}

			const sessionToken = localStorage.getItem("fs_session_token");
			if (!sessionToken) {
				return;
			}

			await api.rpc.base.delete("/auth/session", {
				headers: {
					"x-session-token": sessionToken,
				},
			});

			// Clear local storage
			clearSessionToken();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["fsQ-sessions"] });
		},
	});
}

/**
 * Hook to revoke all sessions (logout everywhere)
 */
export function useRevokeAllSessions() {
	const { api, wallet } = useFilosignContext();
	const queryClient = useQueryClient();

	return useMutation<void, Error>({
		mutationFn: async () => {
			if (!api) {
				throw new Error("API not initialized");
			}

			await api.rpc.base.delete("/auth/sessions");

			// Clear local storage and memory
			clearSessionToken();
			if (wallet) {
				clearSessionSeed(wallet.account.address);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["fsQ-sessions"] });
			queryClient.invalidateQueries({ queryKey: ["fsQ-is-logged-in"] });
		},
	});
}
