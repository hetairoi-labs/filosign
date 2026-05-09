import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useFilosignContext } from "../../context/FilosignProvider";
import { setSessionSeed } from "./session-seed";

interface SessionRestoreResult {
	seed: Uint8Array;
}

/**
 * Hook to restore session from server-side storage
 * Call this on app mount to check for existing session
 */
export function useSessionRestore() {
	const { api, wallet } = useFilosignContext();

	return useQuery<SessionRestoreResult, Error>({
		queryKey: ["fsQ-session-restore", wallet?.account.address],
		queryFn: async () => {
			if (!api || !wallet) {
				throw new Error("API or wallet not initialized");
			}

			// Get stored session token
			const sessionToken = localStorage.getItem("fs_session_token");
			if (!sessionToken) {
				throw new Error("No session token found");
			}

			// Make request with session token header
			const response = await api.rpc.getSafe(
				{
					seed: z.array(z.number()),
					walletAddress: z.string(),
				},
				"/auth/session",
				{
					headers: {
						"x-session-token": sessionToken,
					},
				},
			);

			const seed = new Uint8Array(response.data.seed);
			const sessionWallet = response.data.walletAddress;

			// Validate that session belongs to current wallet
			if (
				sessionWallet.toLowerCase() !== wallet.account.address.toLowerCase()
			) {
				throw new Error("Session wallet mismatch");
			}

			// Store in memory
			setSessionSeed(wallet.account.address, seed);

			return { seed };
		},
		enabled: false,
		retry: false,
		staleTime: Infinity,
		gcTime: 0,
	});
}

/**
 * Check if a session token exists in storage
 */
export function hasSessionToken(): boolean {
	if (typeof window === "undefined") return false;
	return !!localStorage.getItem("fs_session_token");
}

/**
 * Clear session token from storage
 */
export function clearSessionToken(): void {
	if (typeof window === "undefined") return;
	localStorage.removeItem("fs_session_token");
}
