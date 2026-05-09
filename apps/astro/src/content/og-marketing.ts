/**
 * Open Graph card copy — keep in sync with each page’s `<BaseLayout title/description>`.
 * Keys map to URL → {@link ../lib/og-slug.ts ogSlugFromPathname}.
 */
export const MARKETING_OG_PAGES = {
	index: {
		title: "Filosign — Trustless standard for permanent agreements",
		description:
			"Send, sign, and verify sensitive documents with encrypted workflows. Private document signing on the blockchain with self-sovereign identity and end-to-end encryption.",
	},
	about: {
		title: "About Filosign — Transforming document signing",
		description:
			"Filosign is on a mission to transform document signing with secure, decentralized, and efficient solutions for the modern web.",
	},
	pricing: {
		title: "Pricing — Secure signing for every scale",
		description:
			"From individual creators to global enterprises, Filosign has a plan that grows with you. Start for free.",
	},
	changelog: {
		title: "Changelog — What's new at Filosign",
		description:
			"A changelog of new features, design improvements and enhancements lately. Stay up to date with the latest changes to Filosign.",
	},
	blog: {
		title: "Blog — News and updates from Filosign",
		description:
			"Read about the latest updates, features, and insights from the Filosign team.",
	},
	"blog-introduction": {
		title: "Introducing Filosign — Filosign Blog",
		description:
			"Six months ago, we started working on Filosign; an idea focused on creating a completely private and end-to-end encrypted document signing standard.",
	},
	"blog-future-of-digital-agreements": {
		title: "The future of digital agreements: Why we built Filosign — Filosign Blog",
		description:
			"Long-form perspective on platform risk in e-sign, Filosign's architecture on FVM, and post-quantum signing.",
	},
} as const;

export type MarketingOgSlug = keyof typeof MARKETING_OG_PAGES;
