import { useCallback, useEffect, useRef } from "react";

/**
 * Hook for safe timeout handling that automatically cleans up on unmount
 * Prevents memory leaks and state updates on unmounted components
 */
export function useTimeout() {
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const setSafeTimeout = useCallback((callback: () => void, delay: number) => {
		// Clear any existing timeout first
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		timeoutRef.current = setTimeout(() => {
			timeoutRef.current = null;
			callback();
		}, delay);
	}, []);

	const clearSafeTimeout = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	return { setSafeTimeout, clearSafeTimeout };
}
