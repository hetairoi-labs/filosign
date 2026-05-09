/**
 * Sets a cookie with the given name, value, and options
 * @param name - The name of the cookie
 * @param value - The value of the cookie
 * @param options - Optional cookie settings
 */
export function setCookie(
	name: string,
	value: string,
	options: {
		path?: string;
		maxAge?: number;
		domain?: string;
		secure?: boolean;
		sameSite?: "strict" | "lax" | "none";
	} = {},
): void {
	if (typeof document === "undefined") {
		return;
	}

	let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

	if (options.path) {
		cookieString += `; path=${options.path}`;
	}

	if (options.maxAge !== undefined) {
		cookieString += `; max-age=${options.maxAge}`;
	}

	if (options.domain) {
		cookieString += `; domain=${options.domain}`;
	}

	if (options.secure) {
		cookieString += "; secure";
	}

	if (options.sameSite) {
		cookieString += `; samesite=${options.sameSite}`;
	}

	// biome-ignore lint/suspicious/noDocumentCookie: This is a utility function that encapsulates cookie operations
	document.cookie = cookieString;
}

/**
 * Gets a cookie value by name
 * @param name - The name of the cookie to retrieve
 * @returns The cookie value or null if not found
 */
export function getCookie(name: string): string | null {
	if (typeof document === "undefined") {
		return null;
	}

	const nameEQ = `${encodeURIComponent(name)}=`;
	const cookies = document.cookie.split(";");

	for (let cookie of cookies) {
		cookie = cookie.trim();
		if (cookie.startsWith(nameEQ)) {
			return decodeURIComponent(cookie.substring(nameEQ.length));
		}
	}

	return null;
}

/**
 * Deletes a cookie by name
 * @param name - The name of the cookie to delete
 * @param options - Optional path and domain settings
 */
export function deleteCookie(
	name: string,
	options: { path?: string; domain?: string } = {},
): void {
	setCookie(name, "", {
		...options,
		maxAge: -1,
	});
}
