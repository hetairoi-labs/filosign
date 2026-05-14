import interLatinWoff2Url from "@fontsource-variable/inter/files/inter-latin-standard-normal.woff2?url";
import manropeLatinWoff2Url from "@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2?url";
import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument, PDFFont } from "pdf-lib";

export type CompliancePdfEmbeddedFonts = {
	/** Body and wrapped narrative (Inter when embedding succeeds). */
	body: PDFFont;
	/** Section titles and field labels (Helvetica Bold for reliable weight). */
	sectionTitle: PDFFont;
	/** Wordmark and subtle brand strings (Manrope when embedding succeeds). */
	brand: PDFFont;
	mono: PDFFont;
};

type StandardTriple = {
	helvetica: PDFFont;
	helveticaBold: PDFFont;
	courier: PDFFont;
};

async function fetchFontBytes(url: string): Promise<Uint8Array> {
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Font fetch failed (${res.status}): ${url}`);
	}
	return new Uint8Array(await res.arrayBuffer());
}

/**
 * Embeds marketing fonts for the compliance PDF. Falls back to Helvetica / Courier
 * if embedding fails (network, fontkit, or font format).
 */
export async function loadCompliancePdfEmbeddedFonts(
	doc: PDFDocument,
	standard: StandardTriple,
): Promise<CompliancePdfEmbeddedFonts> {
	doc.registerFontkit(fontkit);
	let body = standard.helvetica;
	let brand = standard.helvetica;
	try {
		const [interBytes, manropeBytes] = await Promise.all([
			fetchFontBytes(interLatinWoff2Url),
			fetchFontBytes(manropeLatinWoff2Url),
		]);
		body = await doc.embedFont(interBytes, { subset: true });
		brand = await doc.embedFont(manropeBytes, { subset: true });
	} catch {
		body = standard.helvetica;
		brand = standard.helvetica;
	}
	return {
		body,
		sectionTitle: standard.helveticaBold,
		brand,
		mono: standard.courier,
	};
}
