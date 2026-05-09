export type Result<T> = [T, null] | [null, Error];

export const safe = <T>(fn: () => T): Result<T> => {
	try {
		return [fn(), null];
	} catch (e) {
		return [null, e instanceof Error ? e : new Error(String(e))];
	}
};

export const safeAsync = async <T>(
	fn: (() => Promise<T>) | Promise<T>,
): Promise<Result<T>> => {
	try {
		const promise = typeof fn === "function" ? fn() : fn;
		const data = await promise;
		return [data, null];
	} catch (e) {
		return [null, e instanceof Error ? e : new Error(String(e))];
	}
};
