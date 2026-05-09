export const logger = {
	debug: (...args: unknown[]) => {
		if (import.meta.env.DEV) {
			console.debug(...args);
		}
	},
	error: (...args: unknown[]) => {
		console.error(...args);
	},
};
