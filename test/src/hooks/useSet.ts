import { useCallback, useRef, useState } from "react";

/**
 * Hook for efficient Set-based state management with O(1) lookups
 * Prevents O(N) array operations on every check
 */
export function useSet<T>(initialValues?: Iterable<T>) {
	const [set, setSet] = useState(() => new Set<T>(initialValues));
	const setRef = useRef(set);

	// Keep ref in sync
	setRef.current = set;

	const add = useCallback((value: T) => {
		setSet((prev) => {
			if (prev.has(value)) return prev;
			return new Set([...prev, value]);
		});
	}, []);

	const has = useCallback((value: T) => {
		return setRef.current.has(value);
	}, []);

	const remove = useCallback((value: T) => {
		setSet((prev) => {
			if (!prev.has(value)) return prev;
			const next = new Set(prev);
			next.delete(value);
			return next;
		});
	}, []);

	const clear = useCallback(() => {
		setSet(new Set());
	}, []);

	const values = useCallback(() => {
		return Array.from(setRef.current);
	}, []);

	return {
		add,
		has,
		remove,
		clear,
		values,
		size: set.size,
	};
}
