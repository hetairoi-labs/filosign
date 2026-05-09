/**
 * Maps the current URL pathname to the `MARKETING_OG_PAGES` key and `/open-graph/*.png` filename stem.
 */
export function ogSlugFromPathname(pathname: string): string {
	const normalized = pathname.replace(/\/$/, "") || "/";
	if (normalized === "/") return "index";
	return normalized.slice(1).replace(/\//g, "-");
}
