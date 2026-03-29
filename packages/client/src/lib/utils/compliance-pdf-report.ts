import {
	breakTextIntoLines,
	PDFDict,
	type PDFDocument,
	type PDFFont,
	PDFName,
	type PDFPage,
	PDFString,
	rgb,
	StandardFonts,
} from "pdf-lib";

import {
	buildCompliancePdfSummary,
	type CompliancePdfLine,
	type CompliancePdfSummaryOptions,
} from "./compliance-export";

const A4 = { w: 595, h: 842 } as const;

const FILOSIGN = {
	accent: rgb(97 / 255, 140 / 255, 48 / 255),
	foreground: rgb(33 / 255, 34 / 255, 35 / 255),
	muted: rgb(112 / 255, 112 / 255, 112 / 255),
	border: rgb(230 / 255, 230 / 255, 230 / 255),
	link: rgb(0.18, 0.42, 0.72),
} as const;

const PDF_M = {
	margin: 48,
	gap: 24,
	sectionGap: 24,
	blankLineGap: 9,
	valueX: 160,
	bodySize: 9,
	labelSize: 9,
	titleSize: 18,
	sectionTitleSize: 11,
	bottomSafe: 50,
} as const;

const WORD_BREAKS_FULL = ["", " ", "-"] as const;

type Ctx = {
	doc: PDFDocument;
	page: PDFPage;
	y: number;
	pw: number;
	ph: number;
	font: PDFFont;
	fontBold: PDFFont;
	fontMono: PDFFont;
};

function lineHeightAt(font: PDFFont, size: number): number {
	return font.heightAtSize(size) * 1.25;
}

function wrapLines(
	text: string,
	maxWidth: number,
	font: PDFFont,
	size: number,
): string[] {
	if (!text) return [""];
	const measure = (t: string) => font.widthOfTextAtSize(t, size);
	return breakTextIntoLines(text, [...WORD_BREAKS_FULL], maxWidth, measure);
}

function chunkHexLines(hex: string, maxChars: number): string[] {
	const clean = hex.replace(/\s/g, "");
	if (clean.length === 0) return [""];
	const out: string[] = [];
	for (let i = 0; i < clean.length; i += maxChars) {
		out.push(clean.slice(i, i + maxChars));
	}
	return out;
}

function addUriLink(
	page: PDFPage,
	baselineX: number,
	baselineY: number,
	text: string,
	size: number,
	font: PDFFont,
	uri: string,
): void {
	const w = font.widthOfTextAtSize(text, size);
	const h = font.heightAtSize(size);
	const context = page.doc.context;
	const action = PDFDict.withContext(context);
	action.set(PDFName.of("Type"), PDFName.of("Action"));
	action.set(PDFName.of("S"), PDFName.of("URI"));
	action.set(PDFName.of("URI"), PDFString.of(uri));

	const llx = baselineX;
	const lly = baselineY - h * 0.35;
	const urx = baselineX + w;
	const ury = baselineY + h * 0.85;

	const annot = PDFDict.withContext(context);
	annot.set(PDFName.of("Type"), PDFName.of("Annot"));
	annot.set(PDFName.of("Subtype"), PDFName.of("Link"));
	annot.set(PDFName.of("Rect"), context.obj([llx, lly, urx, ury]));
	annot.set(PDFName.of("Border"), context.obj([0, 0, 0]));
	annot.set(PDFName.of("A"), action);

	page.node.addAnnot(context.register(annot));
}

function ensureSpace(ctx: Ctx, neededBelowBaseline: number): void {
	if (ctx.y - neededBelowBaseline < PDF_M.bottomSafe) {
		ctx.page = ctx.doc.addPage([A4.w, A4.h]);
		ctx.y = ctx.ph - PDF_M.margin;
		ctx.page.drawText("Filosign record (continued)", {
			x: PDF_M.margin,
			y: ctx.y,
			size: 8,
			font: ctx.fontBold,
			color: FILOSIGN.muted,
		});
		ctx.y -= lineHeightAt(ctx.font, 8) + PDF_M.gap;
	}
}

function drawWrappedLine(
	ctx: Ctx,
	x: number,
	maxW: number,
	line: CompliancePdfLine,
	size: number,
	defaultColor = FILOSIGN.foreground,
): void {
	if (line.text === "") {
		ctx.y -= PDF_M.blankLineGap;
		return;
	}

	const isHex = line.display === "hex-dump";
	const targetFont = isHex ? ctx.fontMono : ctx.font;
	const col = line.linkUri ? FILOSIGN.link : defaultColor;
	const lh = lineHeightAt(targetFont, size);

	let lines: string[];
	if (isHex) {
		const charW = targetFont.widthOfTextAtSize("0", size);
		const charsPerLine = Math.max(16, Math.floor(maxW / charW));
		lines = chunkHexLines(line.text, charsPerLine);
	} else {
		lines = wrapLines(line.text, maxW, targetFont, size);
	}

	for (const ln of lines) {
		ensureSpace(ctx, lh + 4);
		ctx.page.drawText(ln, {
			x,
			y: ctx.y,
			size,
			font: targetFont,
			color: col,
		});
		if (line.linkUri) {
			addUriLink(ctx.page, x, ctx.y, ln, size, targetFont, line.linkUri);
		}
		ctx.y -= lh;
	}
}

export async function drawComplianceReport(
	doc: PDFDocument,
	options: CompliancePdfSummaryOptions,
): Promise<void> {
	const summary = buildCompliancePdfSummary(options);
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
	const fontMono = await doc.embedFont(StandardFonts.Courier);

	const firstPage = doc.addPage([A4.w, A4.h]);
	const ctx: Ctx = {
		doc,
		page: firstPage,
		y: A4.h - PDF_M.margin,
		pw: firstPage.getWidth(),
		ph: firstPage.getHeight(),
		font,
		fontBold,
		fontMono,
	};

	ctx.page.drawText("Filosign Compliance Record", {
		x: PDF_M.margin,
		y: ctx.y,
		size: PDF_M.titleSize,
		font: fontBold,
		color: FILOSIGN.foreground,
	});
	ctx.y -= 18;

	if (summary.explorerBaseUrl) {
		const subText = `Block explorer: ${summary.explorerBaseUrl}`;
		ctx.page.drawText(subText, {
			x: PDF_M.margin,
			y: ctx.y,
			size: 9,
			font,
			color: FILOSIGN.link,
		});
		if (summary.headerSubtitleLinkUri) {
			addUriLink(
				ctx.page,
				PDF_M.margin,
				ctx.y,
				subText,
				9,
				font,
				summary.headerSubtitleLinkUri,
			);
		}
	}
	ctx.y -= 12;

	ctx.page.drawLine({
		start: { x: PDF_M.margin, y: ctx.y },
		end: { x: ctx.pw - PDF_M.margin, y: ctx.y },
		thickness: 2,
		color: FILOSIGN.accent,
	});
	ctx.y -= PDF_M.gap;

	ctx.page.drawText("File Record", {
		x: PDF_M.margin,
		y: ctx.y,
		size: PDF_M.sectionTitleSize,
		font: fontBold,
		color: FILOSIGN.accent,
	});
	ctx.y -= lineHeightAt(fontBold, PDF_M.sectionTitleSize) + 8;

	const valueMaxW = ctx.pw - PDF_M.valueX - PDF_M.margin;

	for (const row of summary.fields) {
		const vLines = wrapLines(row.value, valueMaxW, font, PDF_M.bodySize);
		const lh = lineHeightAt(font, PDF_M.bodySize);
		const valueTotalH = vLines.length * lh;
		const rowH = Math.max(lineHeightAt(fontBold, PDF_M.labelSize), valueTotalH);

		ensureSpace(ctx, rowH + 16);

		ctx.page.drawText(row.label, {
			x: PDF_M.margin,
			y: ctx.y,
			size: PDF_M.labelSize,
			font: fontBold,
			color: FILOSIGN.muted,
		});

		let vy = ctx.y;
		for (const vl of vLines) {
			const vc = row.linkUri ? FILOSIGN.link : FILOSIGN.foreground;
			ctx.page.drawText(vl, {
				x: PDF_M.valueX,
				y: vy,
				size: PDF_M.bodySize,
				font,
				color: vc,
			});
			if (row.linkUri) {
				addUriLink(
					ctx.page,
					PDF_M.valueX,
					vy,
					vl,
					PDF_M.bodySize,
					font,
					row.linkUri,
				);
			}
			vy -= lh;
		}

		ctx.y -= rowH + 6;

		ctx.page.drawLine({
			start: { x: PDF_M.margin, y: ctx.y },
			end: { x: ctx.pw - PDF_M.margin, y: ctx.y },
			thickness: 0.5,
			color: FILOSIGN.border,
		});
		ctx.y -= 10;
	}

	ctx.y -= PDF_M.gap - 10;

	const bodyMaxW = ctx.pw - PDF_M.margin * 2;

	for (const section of summary.sections) {
		ensureSpace(ctx, lineHeightAt(fontBold, PDF_M.sectionTitleSize) + 32);

		ctx.page.drawText(section.title, {
			x: PDF_M.margin,
			y: ctx.y,
			size: PDF_M.sectionTitleSize,
			font: fontBold,
			color: FILOSIGN.accent,
		});
		ctx.y -= lineHeightAt(fontBold, PDF_M.sectionTitleSize) + 8;

		for (const line of section.lines) {
			drawWrappedLine(ctx, PDF_M.margin, bodyMaxW, line, PDF_M.bodySize);
		}
		ctx.y -= PDF_M.sectionGap;
	}
}
