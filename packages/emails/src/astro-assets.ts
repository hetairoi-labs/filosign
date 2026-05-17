/** Marketing site origin for `/public` assets (`logo.webp`, `icons/*`). */
export function getAstroUrl(): string {
	const raw = process.env.ASTRO_URL;
	if (!raw) {
		throw new Error("ASTRO_URL is not set");
	}
	return raw.replace(/\/$/, "");
}

export function astroAssetUrl(path: string): string {
	const normalized = path.startsWith("/") ? path : `/${path}`;
	return `${getAstroUrl()}${normalized}`;
}

/** Resolved at render time from `ASTRO_URL`. */
export const filosignEmailAssets = {
	get logo() {
		return astroAssetUrl("/logo.webp");
	},
	icons: {
		get email() {
			return astroAssetUrl("/icons/mail.svg");
		},
		get x() {
			return astroAssetUrl("/icons/x.svg");
		},
		get website() {
			return astroAssetUrl("/icons/globe.svg");
		},
	},
};
