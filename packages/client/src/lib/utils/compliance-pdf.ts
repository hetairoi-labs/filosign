import type { FileInfo, ViewFileResult } from "@filosign/react/hooks";
import {
	breakTextIntoLines,
	PDFDict,
	PDFDocument,
	type PDFFont,
	type PDFImage,
	PDFName,
	type PDFPage,
	PDFString,
	rgb,
	StandardFonts,
} from "pdf-lib";
import { formatUnits, getAddress, zeroAddress } from "viem";

// -----------------------------------------------------------------------------
// Types (data → summary)
// -----------------------------------------------------------------------------

/** Per-signer incentive row for PDF (from on-chain getSignerIncentive). */
export type SignerIncentiveForPdf = {
	address: string;
	hasIncentive: boolean;
	amount: bigint;
	claimed: boolean;
	tokenLabel: string;
	decimals: number;
};

export type CompliancePdfSummaryOptions = {
	file: FileInfo;
	fileData: ViewFileResult | null;
	chainName: string;
	explorerBaseUrl: string | null;
	exportedAtIso: string;
	/** Optional mapping of wallet address → Privy User ID */
	privyIdMap?: Record<string, string>;
	/**
	 * When set, signer lines include incentive amount, token label, and paid status.
	 * Typically one entry per `file.signers` (see fetchSignerIncentivesForCompliancePdf).
	 */
	signerIncentives?: SignerIncentiveForPdf[];
};

export type CompliancePdfLine = {
	text: string;
	linkUri?: string | null;
	display?: "hex-dump";
};

export type CompliancePdfSummary = {
	explorerBaseUrl: string | null;
	headerSubtitleLinkUri: string | null;
	fields: Array<{
		label: string;
		value: string;
		linkUri?: string | null;
	}>;
	sections: Array<{ title: string; lines: CompliancePdfLine[] }>;
};

export type CompliancePdfOptions = CompliancePdfSummaryOptions;

type RegistryRead = {
	cidIdentifier: (args: readonly [string]) => Promise<`0x${string}`>;
	getSignerIncentive: (
		args: readonly [`0x${string}`, `0x${string}`],
	) => Promise<readonly [`0x${string}`, bigint, boolean]>;
};

/**
 * Load incentive rows for every signer (on-chain). Pass result as `signerIncentives`
 * on CompliancePdfSummaryOptions.
 */
export async function fetchSignerIncentivesForCompliancePdf(
	registryRead: RegistryRead,
	pieceCid: string,
	signers: string[],
	tokenDisplay: (token: `0x${string}`) => { label: string; decimals: number },
): Promise<SignerIncentiveForPdf[]> {
	const cidId = await registryRead.cidIdentifier([pieceCid]);
	const result: SignerIncentiveForPdf[] = [];

	for (const raw of signers) {
		let addr: `0x${string}`;
		try {
			addr = getAddress(raw) as `0x${string}`;
		} catch {
			result.push({
				address: raw,
				hasIncentive: false,
				amount: 0n,
				claimed: false,
				tokenLabel: "",
				decimals: 18,
			});
			continue;
		}

		const [token, amount, claimed] = await registryRead.getSignerIncentive([
			cidId,
			addr,
		]);

		const noToken =
			!token ||
			token.toLowerCase() === zeroAddress.toLowerCase() ||
			amount === 0n;

		if (noToken) {
			result.push({
				address: addr,
				hasIncentive: false,
				amount: 0n,
				claimed: false,
				tokenLabel: "",
				decimals: 18,
			});
		} else {
			const t = token as `0x${string}`;
			const { label, decimals } = tokenDisplay(t);
			result.push({
				address: addr,
				hasIncentive: true,
				amount,
				claimed,
				tokenLabel: label,
				decimals,
			});
		}
	}

	return result;
}

function explorerTxUrl(explorerBase: string, txHash: string): string {
	const base = explorerBase.replace(/\/$/, "");
	return `${base}/tx/${txHash}`;
}

function incentiveSuffixForAddress(
	address: string,
	signerIncentives: SignerIncentiveForPdf[] | undefined,
): string {
	if (!signerIncentives) return "";
	const inc = signerIncentives.find(
		(i) => i.address.toLowerCase() === address.toLowerCase(),
	);
	if (!inc) return "";
	if (!inc.hasIncentive) {
		return " — Incentive: none";
	}
	const amt = formatUnits(inc.amount, inc.decimals);
	const paid = inc.claimed ? "Paid" : "Unpaid";
	return ` — Incentive: ${amt} ${inc.tokenLabel} · ${paid}`;
}

export function buildCompliancePdfSummary(
	options: CompliancePdfSummaryOptions,
): CompliancePdfSummary {
	const {
		file,
		fileData,
		chainName,
		explorerBaseUrl,
		exportedAtIso,
		privyIdMap,
		signerIncentives,
	} = options;

	const regTxLink =
		explorerBaseUrl && file.onchainTxHash
			? explorerTxUrl(explorerBaseUrl, file.onchainTxHash)
			: null;

	const fields: CompliancePdfSummary["fields"] = [
		{ label: "Generated (UTC)", value: exportedAtIso },
		{ label: "Chain", value: chainName },
		{ label: "Piece CID", value: file.pieceCid },
		{ label: "Sender", value: file.sender },
		{ label: "Status", value: file.status },
		{ label: "Created", value: file.createdAt },
		{
			label: "Registration tx",
			value: file.onchainTxHash,
		},
	];

	if (regTxLink) {
		fields.push({
			label: "Explorer link",
			value: regTxLink,
			linkUri: regTxLink,
		});
	}

	const participantLines: CompliancePdfLine[] = [
		{ text: `Signers (${file.signers.length}):` },
	];
	for (const a of file.signers) {
		const privy = privyIdMap?.[a];
		const base = privy ? `  - ${a} (Privy: ${privy})` : `  - ${a}`;
		participantLines.push({
			text: `${base}${incentiveSuffixForAddress(a, signerIncentives)}`,
		});
	}
	participantLines.push({ text: "" });
	participantLines.push({ text: `Viewers (${file.viewers.length}):` });
	for (const a of file.viewers) {
		const privy = privyIdMap?.[a];
		participantLines.push({
			text: privy ? `  - ${a} (Privy: ${privy})` : `  - ${a}`,
		});
	}

	const sigLines: CompliancePdfLine[] = [];
	if (file.signatures.length === 0) {
		sigLines.push({ text: "(none)" });
	} else {
		let sigIndex = 0;
		for (const sig of file.signatures) {
			const txLink =
				explorerBaseUrl && sig.onchainTxHash
					? explorerTxUrl(explorerBaseUrl, sig.onchainTxHash)
					: null;
			sigLines.push({ text: `Signature ${sigIndex + 1}` });
			sigLines.push({
				text: `  Signer: ${sig.signer}${incentiveSuffixForAddress(sig.signer, signerIncentives)}`,
			});
			sigLines.push({ text: `  Timestamp: ${sig.timestamp}` });
			sigLines.push({
				text: `  Transaction: ${sig.onchainTxHash}`,
			});

			if (txLink) {
				sigLines.push({
					text: `  Explorer: ${txLink}`,
					linkUri: txLink,
				});
			}

			if (sigIndex < file.signatures.length - 1) {
				sigLines.push({ text: "" });
			}
			sigIndex += 1;
		}
	}

	const cryptoLines: CompliancePdfLine[] = [
		{
			text: "KEM ciphertext and encrypted key are included so auditors can verify envelopes independently of this UI.",
		},
		{ text: "" },
	];
	if (file.kemCiphertext) {
		cryptoLines.push({
			text: `KEM ciphertext (hex, ${file.kemCiphertext.length} chars):`,
		});
		cryptoLines.push({
			text: file.kemCiphertext.replace(/\s/g, ""),
			display: "hex-dump",
		});
	} else {
		cryptoLines.push({ text: "KEM ciphertext: (null)" });
	}
	cryptoLines.push({ text: "" });
	if (file.encryptedEncryptionKey) {
		cryptoLines.push({
			text: `Encrypted file encryption key (hex, ${file.encryptedEncryptionKey.length} chars):`,
		});
		cryptoLines.push({
			text: file.encryptedEncryptionKey.replace(/\s/g, ""),
			display: "hex-dump",
		});
	} else {
		cryptoLines.push({ text: "Encrypted file encryption key: (null)" });
	}

	const docLines: CompliancePdfLine[] = fileData
		? [
				{
					text: `File name: ${fileData.metadata.name ?? "(unnamed)"}`,
				},
				{
					text: `MIME type: ${fileData.metadata.mimeType ?? "—"}`,
				},
				{
					text: `Decrypted size (bytes): ${String(fileData.fileBytes.length)}`,
				},
				{
					text: "(Raw file bytes are not embedded in this PDF; use Download for the file.)",
				},
			]
		: [
				{
					text: "Document was not decrypted in this session — decrypt to include full file metadata above.",
				},
			];

	return {
		explorerBaseUrl,
		headerSubtitleLinkUri: explorerBaseUrl,
		fields,
		sections: [
			{ title: "Participants", lines: participantLines },
			{ title: "Signatures", lines: sigLines },
			{ title: "Cryptographic material", lines: cryptoLines },
			{ title: "Document content metadata", lines: docLines },
		],
	};
}

// -----------------------------------------------------------------------------
// PDF drawing (layout & styling unchanged)
// -----------------------------------------------------------------------------

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

async function drawComplianceReport(
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

// -----------------------------------------------------------------------------
// Build & download (compliance-only vs document + appendix)
// -----------------------------------------------------------------------------

const EMBED_MARGIN = 48;

export async function buildCompliancePdfOnly(
	options: CompliancePdfOptions,
): Promise<Uint8Array> {
	const doc = await PDFDocument.create();
	await drawComplianceReport(doc, options);
	return doc.save();
}

function isPdfFile(fileData: ViewFileResult): boolean {
	const mime = fileData.metadata.mimeType?.toLowerCase() ?? "";
	const name = fileData.metadata.name?.toLowerCase() ?? "";
	return mime === "application/pdf" || name.endsWith(".pdf");
}

function isRasterableImageMime(mime: string): boolean {
	return (
		mime.startsWith("image/") &&
		!["image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"].includes(
			mime,
		)
	);
}

function sniffImageMimeFromBytes(bytes: Uint8Array): string | null {
	if (bytes.length < 3) return null;
	if (
		bytes.length >= 8 &&
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47
	) {
		return "image/png";
	}
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return "image/jpeg";
	}
	if (
		bytes.length >= 12 &&
		bytes[0] === 0x52 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x46 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	) {
		return "image/webp";
	}
	if (
		bytes.length >= 6 &&
		bytes[0] === 0x47 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46
	) {
		return "image/gif";
	}
	return null;
}

function extensionHintMime(fileName: string | undefined | null): string | null {
	const n = fileName?.toLowerCase() ?? "";
	if (n.endsWith(".png")) return "image/png";
	if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
	if (n.endsWith(".webp")) return "image/webp";
	if (n.endsWith(".gif")) return "image/gif";
	return null;
}

function resolveRasterImageMime(
	bytes: Uint8Array,
	declaredMime: string | undefined,
	fileName: string | undefined | null,
): string | null {
	const d = declaredMime?.trim().toLowerCase() ?? "";
	if (d && isRasterableImageMime(d)) return d;
	const sniffed = sniffImageMimeFromBytes(bytes);
	if (sniffed && isRasterableImageMime(sniffed)) return sniffed;
	const ext = extensionHintMime(fileName);
	if (ext && isRasterableImageMime(ext)) return ext;
	return null;
}

async function bytesToPngBytes(
	bytes: Uint8Array,
	mime: string,
): Promise<Uint8Array> {
	const lower = mime.toLowerCase();
	if (
		lower === "image/png" ||
		lower === "image/jpeg" ||
		lower === "image/jpg"
	) {
		return bytes;
	}
	const blob = new Blob([bytes.slice()], {
		type: mime || "application/octet-stream",
	});
	const bitmap = await createImageBitmap(blob);
	const canvas = document.createElement("canvas");
	canvas.width = bitmap.width;
	canvas.height = bitmap.height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not create canvas context");
	ctx.drawImage(bitmap, 0, 0);
	bitmap.close();
	const pngBlob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
			"image/png",
		);
	});
	const buf = await pngBlob.arrayBuffer();
	return new Uint8Array(buf);
}

async function embedImagePage(
	doc: PDFDocument,
	bytes: Uint8Array,
	mime: string,
): Promise<void> {
	const page = doc.addPage([A4.w, A4.h]);
	const lower = mime.toLowerCase();
	let image: PDFImage;
	if (lower === "image/png") {
		try {
			image = await doc.embedPng(bytes);
		} catch {
			image = await doc.embedPng(await bytesToPngBytes(bytes, "image/png"));
		}
	} else if (lower === "image/jpeg" || lower === "image/jpg") {
		try {
			image = await doc.embedJpg(bytes);
		} catch {
			image = await doc.embedPng(await bytesToPngBytes(bytes, mime));
		}
	} else {
		image = await doc.embedPng(await bytesToPngBytes(bytes, mime));
	}
	const iw = image.width;
	const ih = image.height;
	const maxW = page.getWidth() - 2 * EMBED_MARGIN;
	const maxH = page.getHeight() - 2 * EMBED_MARGIN;
	const scale = Math.min(maxW / iw, maxH / ih, 1);
	const w = iw * scale;
	const h = ih * scale;
	const x = (page.getWidth() - w) / 2;
	const y = (page.getHeight() - h) / 2;
	page.drawImage(image, { x, y, width: w, height: h });
}

export async function buildDocumentPlusCompliancePdf(
	options: CompliancePdfOptions & { fileData: ViewFileResult },
): Promise<Uint8Array> {
	const { fileData } = options;
	const out = await PDFDocument.create();

	if (isPdfFile(fileData)) {
		try {
			const src = await PDFDocument.load(fileData.fileBytes);
			const copied = await out.copyPages(src, src.getPageIndices());
			for (const p of copied) {
				out.addPage(p);
			}
		} catch {
			throw new Error(
				"The PDF could not be read. Try downloading the original file separately.",
			);
		}
	} else {
		const resolved = resolveRasterImageMime(
			fileData.fileBytes,
			fileData.metadata.mimeType,
			fileData.metadata.name,
		);
		if (!resolved) {
			throw new Error(
				"Bundled PDF export supports PDF and image documents. Download the file and compliance appendix separately.",
			);
		}
		await embedImagePage(out, fileData.fileBytes, resolved);
	}

	await drawComplianceReport(out, options);
	return out.save();
}

export function downloadPdfBytes(bytes: Uint8Array, filenameBase: string) {
	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	const safe = filenameBase.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
	const blob = new Blob([bytes.slice()], { type: "application/pdf" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `${safe}-${stamp}.pdf`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
