import { type EffectCallback, useEffect, useRef } from "react";

/**
 * Hook that runs an effect only once after all values in waitFor are resolved and defined
 * Useful for initialization logic that should only run once after dependencies are ready
 */
export function useEffectOnce(
	effect: EffectCallback,
	waitFor: Array<Promise<unknown> | unknown | undefined>,
) {
	const hasRun = useRef(false);
	const effectRef = useRef(effect);

	// Update the effect ref when effect changes
	effectRef.current = effect;

	useEffect(() => {
		if (hasRun.current) return;

		// Check if all values in waitFor are defined and not promises
		const allResolved = waitFor.every(
			(value) => value !== undefined && !(value instanceof Promise),
		);

		if (!allResolved) return;

		hasRun.current = true;
		return effectRef.current();
	}, [waitFor]);
}
