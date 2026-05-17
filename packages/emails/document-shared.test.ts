import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
	astroAssetUrl,
	filosignEmailAssets,
	getAstroUrl,
} from "./src/astro-assets";
import { renderDocumentShared } from "./src/render-document-shared";

const TEST_ASTRO_URL = "https://marketing.example";
const priorAstroUrl = process.env.ASTRO_URL;

beforeAll(() => {
	process.env.ASTRO_URL = TEST_ASTRO_URL;
});

afterAll(() => {
	if (priorAstroUrl === undefined) {
		delete process.env.ASTRO_URL;
	} else {
		process.env.ASTRO_URL = priorAstroUrl;
	}
});

describe("renderDocumentShared", () => {
	test("warm variant includes sign-in copy, Button, and astro assets", async () => {
		expect(getAstroUrl()).toBe(TEST_ASTRO_URL);
		expect(filosignEmailAssets.logo).toBe(astroAssetUrl("/logo.webp"));

		const { html, text } = await renderDocumentShared({
			senderLabel: "Alex Chen",
			ctaHref: "https://app.example/sign?pieceCid=abc",
			variant: "warm",
		});
		expect(html).toContain("You have a document to review");
		expect(html).toContain("Sign in with this email to open it");
		expect(html).toContain(`${TEST_ASTRO_URL}/logo.webp`);
		expect(html).toContain(`${TEST_ASTRO_URL}/icons/mail.svg`);
		expect(html).toMatch(
			/<a[^>]*href="https:\/\/app\.example\/sign\?pieceCid=abc"/,
		);
		expect(html).toContain("Open document");
		expect(text).toContain("Alex Chen");
		expect(html).toContain("financial agreements and instant settlements");
		expect(html).toContain("mailto:kartik@filosign.xyz");
		expect(html).toContain("https://x.com/filosign");
		expect(html).toContain("https://filosign.xyz");
	});

	test("cold variant includes passphrase copy", async () => {
		const { html, text } = await renderDocumentShared({
			senderLabel: "Alex Chen",
			ctaHref: "https://app.example/?coldPieceCid=abc&coldInvite=tok",
			variant: "cold",
		});
		expect(html).toContain("A document was shared with you");
		expect(html).toContain("six-word passphrase");
		expect(html).toContain(`${TEST_ASTRO_URL}/logo.webp`);
		expect(html).toContain("coldInvite=tok");
		expect(text.length).toBeGreaterThan(0);
	});
});
