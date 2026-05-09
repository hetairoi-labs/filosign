/**
 * Browser security headers + CSP for the Filosign client (Privy + WalletConnect + API).
 * @see https://docs.privy.io/security/implementation-guide/content-security-policy
 */

const PRIVY_CONNECT =
	"https://auth.privy.io wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org https://*.rpc.privy.systems https://explorer-api.walletconnect.com";

const PRIVY_FRAMES =
	"https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com";

function normalizeSpaces(s: string): string {
	return s.replace(/\s+/g, " ").trim();
}

export function parseApiOrigin(platformUrl: string | undefined): string | null {
	if (!platformUrl) return null;
	try {
		return new URL(platformUrl).origin;
	} catch {
		return null;
	}
}

/**
 * `isDev`: Vite dev server (HMR needs relaxed script-src).
 * `apiOrigin`: origin of `VITE_PLATFORM_URL` (API), e.g. `http://127.0.0.1:30011`.
 */
export function buildContentSecurityPolicy(
	isDev: boolean,
	apiOrigin: string | null,
): string {
	const scriptSrc = isDev
		? "'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://challenges.cloudflare.com"
		: "'self' 'wasm-unsafe-eval' https://challenges.cloudflare.com";

	// Dev: allow local Hardhat, HMR websockets, arbitrary HTTPS RPC. Prod: HTTPS + WSS only (no http:).
	const connectTail = isDev ? "http: https: ws: wss:" : "https: wss:";

	const apiPart = apiOrigin ? `${apiOrigin} ` : "";

	return normalizeSpaces(`
		default-src 'self';
		script-src ${scriptSrc};
		style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
		style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com;
		img-src 'self' data: blob: https:;
		font-src 'self' data: https://fonts.gstatic.com;
		object-src 'none';
		base-uri 'self';
		form-action 'self';
		frame-ancestors 'none';
		child-src https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org;
		frame-src ${PRIVY_FRAMES};
		connect-src 'self' ${PRIVY_CONNECT} ${apiPart}${connectTail};
		worker-src 'self' blob:;
		manifest-src 'self'
	`);
}

export function securityHeadersRecord(
	isDev: boolean,
	apiOrigin: string | null,
): Record<string, string> {
	return {
		"Content-Security-Policy": buildContentSecurityPolicy(isDev, apiOrigin),
		"X-Content-Type-Options": "nosniff",
		"Referrer-Policy": "strict-origin-when-cross-origin",
		"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
	};
}
