import type { ViewFileResult } from "@filosign/react/hooks";
import { PDFDocument, type PDFImage } from "pdf-lib";

import type { CompliancePdfSummaryOptions } from "./compliance-export";
import { drawComplianceReport } from "./compliance-pdf-report";

const A4 = { w: 595, h: 842 } as const;
/** Margin for embedded document pages (image / merged PDF). */
const EMBED_MARGIN = 48;

export type CompliancePdfOptions = CompliancePdfSummaryOptions;

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

/** Detect image format when metadata MIME is missing or generic (e.g. octet-stream). */
function sniffImageMimeFromBytes(bytes: Uint8Array): string | null {
	if (bytes.length < 3) return null;
	// PNG
	if (
		bytes.length >= 8 &&
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47
	) {
		return "image/png";
	}
	// JPEG
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return "image/jpeg";
	}
	// WebP (RIFF....WEBP)
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
	// GIF
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

/** Effective MIME for embedding: declared type, magic bytes, or filename extension. */
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
			// Some PNG variants fail pdf-lib; normalize via canvas
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

/**
 * Original document pages + compliance appendix. PDFs are merged; images are embedded on a page then appendix.
 * Requires decrypted `fileData` on `options`.
 */
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
