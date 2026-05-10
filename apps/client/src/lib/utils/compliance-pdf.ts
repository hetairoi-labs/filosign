import type { ViewFileResult } from "@filosign/react/hooks";
import type { ComplianceBundleV1 } from "@filosign/shared";
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

export type CompliancePdfBundleOptions = {
	bundle: ComplianceBundleV1;
	bundleHash: `0x${string}`;
	exportId: string;
	chainName: string;
	explorerBaseUrl: string | null;
	/** Optional mapping of wallet address → Privy User ID */
	privyIdMap?: Record<string, string>;
	signerIncentives?: SignerIncentiveForPdf[];
	/** Client-computed digest of decrypted bytes, if available (sent to export logging). */
	documentSha256?: string;
	/** When the document was decrypted for bundling, include basic file facts in the appendix. */
	decryptedDocumentMeta?: {
		name: string | null | undefined;
		mimeType: string | null | undefined;
		sizeBytes: number;
	} | null;
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

export type CompliancePdfOptions = CompliancePdfBundleOptions;

type RegistryRead = {
	cidIdentifier: (args: readonly [string]) => Promise<`0x${string}`>;
	getSignerIncentive: (
		args: readonly [`0x${string}`, `0x${string}`],
	) => Promise<readonly [`0x${string}`, bigint, boolean]>;
};

type Participant =
	| string
	| {
			wallet: string;
			name: string | null;
			email: string | null;
	  };

function participantWallet(p: Participant): string {
	return typeof p === "string" ? p : p.wallet;
}

/**
 * Load incentive rows for every signer (on-chain). Pass result as `signerIncentives`
 * on `CompliancePdfBundleOptions`.
 */
export async function fetchSignerIncentivesForCompliancePdf(
	registryRead: RegistryRead,
	pieceCid: string,
	signers: Participant[],
	tokenDisplay: (token: `0x${string}`) => { label: string; decimals: number },
): Promise<SignerIncentiveForPdf[]> {
	const cidId = await registryRead.cidIdentifier([pieceCid]);
	const result: SignerIncentiveForPdf[] = [];

	for (const s of signers) {
		const raw = participantWallet(s);
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
		return " - Incentive: none";
	}
	const amt = formatUnits(inc.amount, inc.decimals);
	const paid = inc.claimed ? "Paid" : "Unpaid";
	return ` - Incentive: ${amt} ${inc.tokenLabel} / ${paid}`;
}

function fieldPlacementStatus(
	bundle: ComplianceBundleV1,
	fieldId: string,
	assignedWallet: string,
): "signed" | "draft" | "pending" {
	const row = bundle.signers.find(
		(s) => s.wallet.toLowerCase() === assignedWallet.toLowerCase(),
	);
	if (!row) return "pending";
	if (row.signed && row.completedFieldIds.includes(fieldId)) return "signed";
	if (row.draftCompletedFieldIds.includes(fieldId)) return "draft";
	return "pending";
}

function shortId(uuid: string): string {
	return uuid.slice(0, 8);
}

function truncateHash(hash: string, head: number, tail: number): string {
	if (hash.length <= head + tail + 3) return hash;
	return `${hash.slice(0, head)}...${hash.slice(-tail)}`;
}

export function buildCompliancePdfSummaryFromBundle(
	options: CompliancePdfBundleOptions,
): CompliancePdfSummary {
	const {
		bundle,
		bundleHash,
		exportId,
		chainName,
		explorerBaseUrl,
		privyIdMap,
		signerIncentives,
		documentSha256,
		decryptedDocumentMeta,
	} = options;

	const regTxLink =
		explorerBaseUrl && bundle.registration.registrationTxHash
			? explorerTxUrl(explorerBaseUrl, bundle.registration.registrationTxHash)
			: null;

	const execPlain =
		bundle.executionStatus === "fully_executed"
			? "Fully executed - every required signer has an on-chain signature recorded as of this export."
			: "Partially executed - at least one signer has not yet recorded an on-chain signature. This record reflects status at export time only.";

	const fields: CompliancePdfSummary["fields"] = [
		{ label: "Export ID", value: exportId },
		{ label: "Bundle hash (SHA-256)", value: bundleHash },
		{ label: "Generated (UTC)", value: bundle.exportedAtIso },
		{ label: "Chain ID", value: String(bundle.chainId) },
		{ label: "Chain", value: chainName },
		{ label: "Piece CID", value: bundle.pieceCid },
		{ label: "Execution (system)", value: bundle.executionStatus },
		{ label: "Placement commitment", value: bundle.placementCommitment },
		{ label: "Sender", value: bundle.registration.sender },
		{ label: "Registered", value: bundle.registration.createdAtIso },
		{
			label: "Registration tx",
			value: bundle.registration.registrationTxHash,
		},
	];

	if (documentSha256) {
		fields.push({
			label: "Document SHA-256",
			value: documentSha256,
		});
	}

	if (regTxLink) {
		fields.push({
			label: "Registration explorer link",
			value: regTxLink,
			linkUri: regTxLink,
		});
	}

	const hasExplorerLinks = Boolean(explorerBaseUrl);
	const explorerNote = hasExplorerLinks
		? "Registration and signature transaction links are provided below for blockchain verification."
		: "No blockchain explorer configured for this network - verify transactions manually using the chain ID and transaction hashes provided.";

	const plainLines: CompliancePdfLine[] = [
		{
			text:
				"The bundle hash identifies this exact JSON snapshot. " + explorerNote,
		},
		{ text: "" },
		{ text: execPlain },
	];

	const signerMatrix: CompliancePdfLine[] = [
		{ text: "Each required participant and their on-chain status:" },
		{ text: "" },
	];

	for (let i = 0; i < bundle.signers.length; i++) {
		const s = bundle.signers[i];
		const privy = privyIdMap?.[s.wallet];

		// Build identity line
		const parts: string[] = [];
		if (s.displayName) parts.push(s.displayName);
		if (s.email) parts.push(s.email);
		parts.push(s.wallet);
		if (privy) parts.push(`(ID: ${privy})`);

		const identityLine = parts.join(" / ");
		const incentiveInfo = incentiveSuffixForAddress(s.wallet, signerIncentives);

		// Status indicator
		const statusLabel = s.signed ? "SIGNED" : "NOT SIGNED";

		signerMatrix.push({ text: `${i + 1}. ${identityLine}${incentiveInfo}` });

		if (s.signed) {
			signerMatrix.push({ text: `   Status: ${statusLabel}` });
			if (s.completionsRoot) {
				signerMatrix.push({
					text: `   Root: ${s.completionsRoot.slice(0, 32)}...${s.completionsRoot.slice(-16)}`,
				});
			}
			if (s.onchainTxHash) {
				signerMatrix.push({ text: `   Tx: ${s.onchainTxHash}` });
				if (explorerBaseUrl) {
					const txLink = explorerTxUrl(explorerBaseUrl, s.onchainTxHash);
					signerMatrix.push({ text: `   Link: ${txLink}`, linkUri: txLink });
				}
			}
		} else {
			signerMatrix.push({ text: `   Status: ${statusLabel}` });
			if (s.draftCompletedFieldIds.length > 0) {
				signerMatrix.push({
					text: `   Draft fields: ${s.draftCompletedFieldIds.join(", ")}`,
				});
			}
		}

		// Compact separator (single blank line between signers)
		if (i < bundle.signers.length - 1) {
			signerMatrix.push({ text: "" });
		}
	}

	const docMetaLines: CompliancePdfLine[] = decryptedDocumentMeta
		? [
				{ text: "Decrypted document snapshot (this export only):" },
				{ text: "" },
				{
					text: `Name: ${decryptedDocumentMeta.name ?? "(unnamed)"} / ${decryptedDocumentMeta.mimeType ?? "-"} / ${String(decryptedDocumentMeta.sizeBytes)} bytes`,
				},
				{
					text: "Note: Raw bytes are not embedded; document hash binds the viewed content.",
				},
			]
		: [
				{
					text: "Document bytes were not available in this session. The bundle still reflects on-chain placement and signatures.",
				},
			];

	const placementRef: CompliancePdfLine[] = [
		{
			text: "Field placements (coordinates normalized 0-1; page numbers are 1-based):",
		},
		{ text: "" },
	];

	for (let i = 0; i < bundle.placementManifest.fields.length; i++) {
		const f = bundle.placementManifest.fields[i];
		const st = fieldPlacementStatus(bundle, f.id, f.assignedSigner);
		const signerRow = bundle.signers.find(
			(s) => s.wallet.toLowerCase() === f.assignedSigner.toLowerCase(),
		);
		const name = signerRow?.displayName?.trim();
		const email = signerRow?.email?.trim();

		const statusLabel =
			st === "signed" ? "SIGNED" : st === "draft" ? "DRAFT" : "PENDING";
		const reqLabel = f.required ? "required" : "optional";

		placementRef.push({
			text: `${i + 1}. ${f.id} (${f.type}, ${reqLabel}, ${statusLabel})`,
		});
		placementRef.push({
			text: `   Page ${f.pageIndex + 1} / Rect [x:${f.rect.x.toFixed(3)} y:${f.rect.y.toFixed(3)} w:${f.rect.width.toFixed(3)} h:${f.rect.height.toFixed(3)}]`,
		});

		// Signer info on single line when possible
		const signerParts: string[] = [];
		if (name) signerParts.push(name);
		if (email) signerParts.push(email);
		signerParts.push(f.assignedSigner);
		placementRef.push({ text: `   -> ${signerParts.join(" | ")}` });

		// Compact separator
		if (i < bundle.placementManifest.fields.length - 1) {
			placementRef.push({ text: "" });
		}
	}

	const manifestJson = JSON.stringify(bundle.placementManifest, null, 2);
	const manifestLines: CompliancePdfLine[] = [
		{
			text: "Full placement manifest JSON (canonical for placement commitment):",
		},
		{ text: "" },
	];
	for (const line of manifestJson.split("\n")) {
		manifestLines.push({ text: line || " " });
	}

	const cryptoDetail: CompliancePdfLine[] = [
		{
			text: "Merkle proofs verify each field completion on-chain. Each leaf hashes: field ID + placement commitment + piece CID digest + signer address. Siblings reconstruct the completions root.",
		},
		{ text: "" },
	];

	for (let signerIdx = 0; signerIdx < bundle.signers.length; signerIdx++) {
		const s = bundle.signers[signerIdx];
		const signerNum = signerIdx + 1;

		// Visual header for signer
		const statusBadge = s.signed ? "SIGNED" : "NOT SIGNED";
		cryptoDetail.push({ text: `+-- Signer ${signerNum} ${statusBadge}` });
		cryptoDetail.push({ text: `| Wallet: ${truncateHash(s.wallet, 20, 12)}` });

		if (s.completionsRoot) {
			cryptoDetail.push({
				text: `| Root:   ${truncateHash(s.completionsRoot, 20, 12)}`,
			});
		}

		if (s.completedFieldIds.length > 0) {
			cryptoDetail.push({
				text: `| Fields: ${s.completedFieldIds.join(", ")}`,
			});
		}

		// Merkle proofs section
		if (s.merkleProofs.length > 0) {
			cryptoDetail.push({ text: "|" });
			cryptoDetail.push({ text: "| Proofs:" });

			for (let pIdx = 0; pIdx < s.merkleProofs.length; pIdx++) {
				const pr = s.merkleProofs[pIdx];
				const isLastProof = pIdx === s.merkleProofs.length - 1;
				const proofPrefix = isLastProof ? "`--" : "|--";
				const childPrefix = isLastProof ? "    " : "|   ";

				// Field ID and leaf hash on one compact line
				cryptoDetail.push({
					text: `| ${proofPrefix} [${shortId(pr.fieldId)}] leaf ${pr.leafIndex}: ${truncateHash(pr.leafHash, 14, 10)}`,
				});

				// Siblings display
				if (pr.siblings.length === 0) {
					cryptoDetail.push({
						text: `| ${childPrefix}\`-- (no siblings - single leaf)`,
					});
				} else if (pr.siblings.length === 1) {
					cryptoDetail.push({
						text: `| ${childPrefix}\`-- ${truncateHash(pr.siblings[0], 14, 10)}`,
					});
				} else {
					cryptoDetail.push({
						text: `| ${childPrefix}\`-- ${pr.siblings.length} siblings:`,
					});
					for (let sIdx = 0; sIdx < pr.siblings.length; sIdx++) {
						const isLastSib = sIdx === pr.siblings.length - 1;
						const sibPrefix = isLastSib ? "`--" : "|--";
						cryptoDetail.push({
							text: `| ${childPrefix}   ${sibPrefix} ${truncateHash(pr.siblings[sIdx], 14, 10)}`,
						});
					}
				}
			}
		}

		cryptoDetail.push({ text: "+------------------------------" });

		// Compact separator between signers
		if (signerIdx < bundle.signers.length - 1) {
			cryptoDetail.push({ text: "" });
		}
	}

	return {
		explorerBaseUrl,
		headerSubtitleLinkUri: explorerBaseUrl,
		fields,
		sections: [
			{ title: "Summary for reviewers", lines: plainLines },
			{ title: "Signer matrix", lines: signerMatrix },
			{ title: "Document content metadata", lines: docMetaLines },
			{ title: "Field placements", lines: placementRef },
			{ title: "Placement manifest (JSON)", lines: manifestLines },
			{ title: "Technical - Merkle / completions", lines: cryptoDetail },
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
	margin: 56,
	gap: 20,
	sectionGap: 18,
	sectionTitleBottomPad: 10,
	blankLineGap: 8,
	valueX: 200,
	bodySize: 10,
	labelSize: 10,
	titleSize: 20,
	sectionTitleSize: 12,
	bottomSafe: 56,
	fieldRowGapAfterRule: 10,
	fieldLabelValueGap: 6,
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
	return font.heightAtSize(size) * 1.38;
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
		ensureSpace(ctx, lh + 10);
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
	options: CompliancePdfBundleOptions,
): Promise<void> {
	const summary = buildCompliancePdfSummaryFromBundle(options);
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
	ctx.y -= 22;

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
	ctx.y -= 16;

	ctx.page.drawLine({
		start: { x: PDF_M.margin, y: ctx.y },
		end: { x: ctx.pw - PDF_M.margin, y: ctx.y },
		thickness: 2,
		color: FILOSIGN.accent,
	});
	ctx.y -= PDF_M.gap + 4;

	ctx.page.drawText("File Record", {
		x: PDF_M.margin,
		y: ctx.y,
		size: PDF_M.sectionTitleSize,
		font: fontBold,
		color: FILOSIGN.accent,
	});
	ctx.y -=
		lineHeightAt(fontBold, PDF_M.sectionTitleSize) +
		PDF_M.sectionTitleBottomPad;

	const valueMaxW = ctx.pw - PDF_M.valueX - PDF_M.margin;

	for (const row of summary.fields) {
		const vLines = wrapLines(row.value, valueMaxW, font, PDF_M.bodySize);
		const lh = lineHeightAt(font, PDF_M.bodySize);
		const valueTotalH = vLines.length * lh;
		const labelH = lineHeightAt(fontBold, PDF_M.labelSize);
		const rowH = Math.max(labelH, valueTotalH);
		const blockPad = PDF_M.fieldLabelValueGap;

		ensureSpace(ctx, rowH + blockPad + PDF_M.fieldRowGapAfterRule + 8);

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

		ctx.y -= rowH + blockPad;

		ctx.page.drawLine({
			start: { x: PDF_M.margin, y: ctx.y },
			end: { x: ctx.pw - PDF_M.margin, y: ctx.y },
			thickness: 0.5,
			color: FILOSIGN.border,
		});
		ctx.y -= PDF_M.fieldRowGapAfterRule;
	}

	ctx.y -= PDF_M.sectionGap;

	const bodyMaxW = ctx.pw - PDF_M.margin * 2;

	for (const section of summary.sections) {
		const sectionTitleH = lineHeightAt(fontBold, PDF_M.sectionTitleSize);
		ensureSpace(ctx, sectionTitleH + PDF_M.sectionTitleBottomPad + 16);

		ctx.page.drawText(section.title, {
			x: PDF_M.margin,
			y: ctx.y,
			size: PDF_M.sectionTitleSize,
			font: fontBold,
			color: FILOSIGN.accent,
		});
		ctx.y -= sectionTitleH + PDF_M.sectionTitleBottomPad;

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

/** SHA-256 over bytes as lowercase 0x-prefixed hex (for compliance export query + appendix). */
export async function sha256HexOfBytes(
	bytes: Uint8Array,
): Promise<`0x${string}`> {
	const buf = bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer;
	const digest = await crypto.subtle.digest("SHA-256", buf);
	const hex = [...new Uint8Array(digest)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return `0x${hex}` as `0x${string}`;
}

type OverlayTextSeg = { text: string; font: PDFFont; size: number };

function overlaySegTotalHeight(segments: OverlayTextSeg[]): number {
	return segments.reduce((acc, s) => acc + lineHeightAt(s.font, s.size), 0);
}

async function drawPlacementOverlaysOnDocumentPdf(
	doc: PDFDocument,
	bundle: ComplianceBundleV1,
): Promise<void> {
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
	const n = doc.getPageCount();

	for (const f of bundle.placementManifest.fields) {
		const pi = f.pageIndex;
		if (pi < 0 || pi >= n) continue;
		const page = doc.getPage(pi);
		const w = page.getWidth();
		const h = page.getHeight();
		const rw = f.rect.width * w;
		const rh = f.rect.height * h;
		const x = f.rect.x * w;
		const yTop = f.rect.y * h;
		const yPdf = h - yTop - rh;

		const st = fieldPlacementStatus(bundle, f.id, f.assignedSigner);
		const border =
			st === "signed"
				? rgb(0.1, 0.55, 0.25)
				: st === "draft"
					? rgb(0.85, 0.5, 0.1)
					: rgb(0.55, 0.55, 0.55);
		const bg =
			st === "signed"
				? rgb(0.75, 0.95, 0.8)
				: st === "draft"
					? rgb(1, 0.94, 0.85)
					: rgb(0.94, 0.94, 0.94);

		page.drawRectangle({
			x,
			y: yPdf,
			width: rw,
			height: rh,
			borderColor: border,
			borderWidth: 1.5,
			color: bg,
			opacity: 0.38,
		});

		const signerRow = bundle.signers.find(
			(s) => s.wallet.toLowerCase() === f.assignedSigner.toLowerCase(),
		);
		const displayName = (signerRow?.displayName ?? "").trim() || "Signer";
		const email = (signerRow?.email ?? "").trim() || "-";
		const statusWord =
			st === "signed" ? "Signed" : st === "draft" ? "Draft" : "Pending";
		const footerText = `${f.type} / ${statusWord}${f.required ? " / required" : " / optional"}`;

		const pad = Math.min(6, Math.max(3, Math.min(rw, rh) * 0.06));
		const innerW = Math.max(28, rw - 2 * pad);

		let nameSize = Math.min(8.5, Math.max(6, Math.min(rh / 5, rw / 22)));

		const buildSegments = (): OverlayTextSeg[] => {
			const detailSize = nameSize * 0.9;
			const tagSize = detailSize * 0.95;
			const parts: OverlayTextSeg[] = [];
			for (const t of wrapLines(displayName, innerW, fontBold, nameSize)) {
				parts.push({ text: t, font: fontBold, size: nameSize });
			}
			for (const t of wrapLines(email, innerW, font, detailSize)) {
				parts.push({ text: t, font, size: detailSize });
			}
			for (const t of wrapLines(footerText, innerW, font, tagSize)) {
				parts.push({ text: t, font, size: tagSize });
			}
			return parts;
		};

		let segments = buildSegments();
		const cap = rh - 2 * pad;
		while (overlaySegTotalHeight(segments) > cap && nameSize > 5.5) {
			nameSize -= 0.5;
			segments = buildSegments();
		}

		if (overlaySegTotalHeight(segments) > cap) {
			const kept: OverlayTextSeg[] = [];
			let used = 0;
			for (const s of segments) {
				const step = lineHeightAt(s.font, s.size);
				if (used + step > cap) break;
				kept.push(s);
				used += step;
			}
			if (kept.length > 0) {
				const last = kept[kept.length - 1];
				const t = last.text;
				kept[kept.length - 1] = {
					...last,
					text:
						t.length > 8
							? `${t.slice(0, Math.max(1, t.length - 4))}...`
							: `${t}...`,
				};
			}
			segments = kept;
		}

		if (segments.length === 0) continue;

		const blockH = Math.min(
			cap,
			Math.max(
				overlaySegTotalHeight(segments),
				lineHeightAt(fontBold, nameSize),
			),
		);
		page.drawRectangle({
			x: x + 0.75,
			y: yPdf + rh - blockH - pad * 0.5,
			width: Math.max(0, rw - 1.5),
			height: blockH + pad * 0.5,
			color: rgb(1, 1, 1),
			opacity: 0.92,
			borderWidth: 0,
		});

		let baseline = yPdf + rh - pad - segments[0].size * 0.85;
		for (const seg of segments) {
			if (baseline < yPdf + pad) break;
			page.drawText(seg.text, {
				x: x + pad,
				y: baseline,
				size: seg.size,
				font: seg.font,
				color: rgb(0.1, 0.1, 0.11),
			});
			baseline -= lineHeightAt(seg.font, seg.size);
		}
	}
}

export async function buildCompliancePdfOnly(
	options: CompliancePdfBundleOptions,
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
			await drawPlacementOverlaysOnDocumentPdf(out, options.bundle);
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
		await drawPlacementOverlaysOnDocumentPdf(out, options.bundle);
	}

	await drawComplianceReport(out, {
		...options,
		decryptedDocumentMeta: {
			name: fileData.metadata.name,
			mimeType: fileData.metadata.mimeType,
			sizeBytes: fileData.fileBytes.length,
		},
	});
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
