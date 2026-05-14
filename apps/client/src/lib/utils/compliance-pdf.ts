import type { ViewFileResult } from "@filosign/react/hooks";
import type { ComplianceBundle, PlacementManifest } from "@filosign/shared";
import {
	hashNormalizedSignerEmail,
	LEAF_SCHEMA_VERSION_V1,
	normalizePlacementRecipientEmail,
} from "@filosign/shared";
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
import {
	buildAboutThisRecordLines,
	buildAppendixLines,
	buildTimestampExplainerLines,
} from "./compliance-pdf-copy";
import { loadCompliancePdfEmbeddedFonts } from "./compliance-pdf-fonts";

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
	bundle: ComplianceBundle;
	bundleHash: `0x${string}`;
	exportId: string;
	chainName: string;
	explorerBaseUrl: string | null;
	/** @deprecated Not shown on the compliance PDF. */
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

		const emailRaw =
			typeof s === "object" && s.email?.trim()
				? normalizePlacementRecipientEmail(s.email)
				: null;
		if (!emailRaw) {
			result.push({
				address: addr,
				hasIncentive: false,
				amount: 0n,
				claimed: false,
				tokenLabel: "",
				decimals: 18,
			});
			continue;
		}

		const signerCommitment = hashNormalizedSignerEmail(emailRaw);

		const [token, amount, claimed] = await registryRead.getSignerIncentive([
			cidId,
			signerCommitment,
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

function fieldPlacementStatusFromSigners(
	signers: Array<{
		email: string | null;
		signed: boolean;
		completedFieldIds: string[];
		draftCompletedFieldIds: string[];
	}>,
	fieldId: string,
	assignedRecipientEmail: string,
): "signed" | "draft" | "pending" {
	const key = assignedRecipientEmail.trim().toLowerCase();
	const row = signers.find(
		(s) => s.email && s.email.trim().toLowerCase() === key,
	);
	if (!row) return "pending";
	if (row.signed && row.completedFieldIds.includes(fieldId)) return "signed";
	if (row.draftCompletedFieldIds.includes(fieldId)) return "draft";
	return "pending";
}

function fieldPlacementStatus(
	bundle: ComplianceBundle,
	fieldId: string,
	assignedRecipientEmail: string,
): "signed" | "draft" | "pending" {
	return fieldPlacementStatusFromSigners(
		bundle.signers,
		fieldId,
		assignedRecipientEmail,
	);
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
		? "Registration, signature, and related FSManager transaction links appear in the transaction index below."
		: "No blockchain explorer configured for this network - verify transactions manually using the chain ID and transaction hashes provided.";

	const aboutLines: CompliancePdfLine[] = [
		...buildAboutThisRecordLines(bundle, explorerNote, execPlain),
		{ text: "" },
		...buildTimestampExplainerLines(),
	];

	const partiesLines: CompliancePdfLine[] = [
		{
			text: "Each row is a participant on this file. Wallet addresses are checksummed. Commitments are one-way fingerprints of email or login subject (see appendix); they allow Filosign to correlate events without storing raw identifiers in the bundle.",
		},
		{ text: "" },
		{ text: "Parties on this file (sender, signers, viewers):" },
		{ text: "" },
	];
	for (let i = 0; i < bundle.parties.length; i++) {
		const p = bundle.parties[i];
		const name = p.displayName?.trim() || "(no display name)";
		partiesLines.push({
			text: `${i + 1}. [${p.role}] ${name} / ${p.email} / ${p.wallet}`,
		});
		partiesLines.push({
			text: `   emailCommitment: ${p.emailCommitment}`,
		});
		if (p.privySubjectCommitment) {
			partiesLines.push({
				text: `   privySubjectCommitment: ${p.privySubjectCommitment}`,
			});
		}
		if (i < bundle.parties.length - 1) partiesLines.push({ text: "" });
	}

	const onchainLines: CompliancePdfLine[] = [];
	if (bundle.onchainRegistration) {
		const o = bundle.onchainRegistration;
		onchainLines.push(
			{
				text: "These fields were read from FSFileRegistry.fileRegistrations for this content id at export time. Compare them to an archive node, indexer, or explorer contract view from the same block height when you need a strict chain match.",
			},
			{ text: "" },
			{
				text: "Snapshot of FSFileRegistry.fileRegistrations(cid) at export time:",
			},
			{ text: "" },
			{ text: `cidIdentifier: ${o.cidIdentifier}` },
			{ text: `sender: ${o.sender}` },
			{ text: `placementCommitment: ${o.placementCommitment}` },
			{ text: `signersCommitment: ${o.signersCommitment}` },
			{ text: `viewersCommitment: ${o.viewersCommitment}` },
			{ text: `senderEmailCommitment: ${o.senderEmailCommitment}` },
			{
				text: `senderPrivySubjectCommitment: ${o.senderPrivySubjectCommitment}`,
			},
			{
				text: `signersCount: ${o.signersCount} / signaturesCount: ${o.signaturesCount}`,
			},
			{ text: `registration timestamp (uint256): ${o.timestamp}` },
		);
	} else {
		onchainLines.push({
			text: "On-chain registration snapshot was unavailable (RPC); verify via explorer using registration tx and piece CID.",
		});
	}

	const txIndexLines: CompliancePdfLine[] = [
		{
			text: "Each line is a transaction Filosign associates with this file on the stated chain. Follow explorer links to inspect input data, events, and status. Summaries are descriptive; authoritative identifiers are the hashes and contract addresses printed here.",
		},
		{ text: "" },
		{ text: "Transaction index (file lifecycle on this chain):" },
		{ text: "" },
	];
	for (let i = 0; i < bundle.transactions.length; i++) {
		const t = bundle.transactions[i];
		const head = `${i + 1}. [${t.kind}] ${t.txHash}`;
		txIndexLines.push({ text: head });
		txIndexLines.push({ text: `   Contract: ${t.contractAddress}` });
		txIndexLines.push({ text: `   ${t.summary}` });
		if (t.blockNumber != null) {
			txIndexLines.push({
				text: `   block: ${t.blockNumber}${t.timestamp != null ? ` / blockTime(utc approx): ${new Date(t.timestamp * 1000).toISOString()}` : ""}`,
			});
		}
		if (explorerBaseUrl) {
			const link = explorerTxUrl(explorerBaseUrl, t.txHash);
			txIndexLines.push({ text: `   Link: ${link}`, linkUri: link });
		}
		if (i < bundle.transactions.length - 1) txIndexLines.push({ text: "" });
	}

	const signerMatrix: CompliancePdfLine[] = [
		{
			text: "Human-oriented view of each signer row: identity, signature status, message times, and links to on-chain transactions when present. Cross-reference the transaction index for full contract context.",
		},
		{ text: "" },
		{ text: "Each required participant and their on-chain status:" },
		{ text: "" },
	];

	for (let i = 0; i < bundle.signers.length; i++) {
		const s = bundle.signers[i];

		// Build identity line
		const parts: string[] = [];
		if (s.displayName) parts.push(s.displayName);
		if (s.email) parts.push(s.email);
		parts.push(s.wallet);

		const identityLine = parts.join(" / ");
		const incentiveInfo = incentiveSuffixForAddress(s.wallet, signerIncentives);

		// Status indicator
		const statusLabel = s.signed ? "SIGNED" : "NOT SIGNED";

		signerMatrix.push({ text: `${i + 1}. ${identityLine}${incentiveInfo}` });

		if (s.signed) {
			signerMatrix.push({ text: `   Status: ${statusLabel}` });
			if (s.signedAtIso) {
				signerMatrix.push({
					text: `   Signed at (EIP-712 message time, UTC): ${s.signedAtIso}`,
				});
			}
			if (s.blockTimestampFromTx != null) {
				signerMatrix.push({
					text: `   Block time from sign tx receipt (UTC): ${new Date(s.blockTimestampFromTx * 1000).toISOString()}`,
				});
			}
			if (s.approveSenderTxHash) {
				signerMatrix.push({
					text: `   approveSender tx: ${s.approveSenderTxHash}`,
				});
				if (explorerBaseUrl) {
					const al = explorerTxUrl(explorerBaseUrl, s.approveSenderTxHash);
					signerMatrix.push({
						text: `   approveSender link: ${al}`,
						linkUri: al,
					});
				}
			}
			if (s.completionsRoot) {
				signerMatrix.push({
					text: `   Root: ${s.completionsRoot}`,
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
				{
					text: "Optional file facts from the session that produced this export. They do not replace the document hash when one is present.",
				},
				{ text: "" },
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
			text: "Normalized coordinates (0–1) locate each field on the PDF page; page numbers are 1-based. Status reflects signer progress against the manifest at export time.",
		},
		{ text: "" },
		{
			text: "Field placements (coordinates normalized 0-1; page numbers are 1-based):",
		},
		{ text: "" },
	];

	for (let i = 0; i < bundle.placementManifest.fields.length; i++) {
		const f = bundle.placementManifest.fields[i];
		const st = fieldPlacementStatus(bundle, f.id, f.assignedRecipientEmail);
		const signerRow = bundle.signers.find(
			(s) =>
				s.email &&
				s.email.trim().toLowerCase() ===
					f.assignedRecipientEmail.trim().toLowerCase(),
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
		signerParts.push(f.assignedRecipientEmail);
		placementRef.push({ text: `   -> ${signerParts.join(" | ")}` });

		// Compact separator
		if (i < bundle.placementManifest.fields.length - 1) {
			placementRef.push({ text: "" });
		}
	}

	const manifestJson = JSON.stringify(bundle.placementManifest, null, 2);
	const manifestLines: CompliancePdfLine[] = [
		{
			text: "Canonical JSON for the placement commitment. Independent verification recomputes the commitment from this exact serialization (see @filosign/shared).",
		},
		{ text: "" },
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
			text: "Cryptographic evidence that each completed field contributes to the signer’s completions root. A reviewer with the manifest, piece CID, placement commitment, and signer address can recompute leaves and verify proofs against the root printed above.",
		},
		{ text: "" },
		{
			text: `Merkle completion leaves (v1): keccak256(abi.encode(uint8 leafSchemaVersion=${LEAF_SCHEMA_VERSION_V1}, bytes32 fieldKey, bytes32 placementCommitment, bytes32 pieceCidDigest, address signer)) where fieldKey = keccak256(utf8 bytes of the manifest field id string) and pieceCidDigest = keccak256(utf8 bytes of the piece CID). Implementation: @filosign/shared computeLeafHashV1.`,
		},
		{ text: "" },
	];

	for (let signerIdx = 0; signerIdx < bundle.signers.length; signerIdx++) {
		const s = bundle.signers[signerIdx];
		const signerNum = signerIdx + 1;

		// Visual header for signer
		const statusBadge = s.signed ? "SIGNED" : "NOT SIGNED";
		cryptoDetail.push({ text: `+-- Signer ${signerNum} ${statusBadge}` });
		cryptoDetail.push({ text: `| Wallet: ${s.wallet}` });

		if (s.completionsRoot) {
			cryptoDetail.push({
				text: `| Root:   ${s.completionsRoot}`,
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
					text: `| ${proofPrefix} [${pr.fieldId}] leaf ${pr.leafIndex}: ${pr.leafHash}`,
				});

				// Siblings display
				if (pr.siblings.length === 0) {
					cryptoDetail.push({
						text: `| ${childPrefix}\`-- (no siblings - single leaf)`,
					});
				} else if (pr.siblings.length === 1) {
					cryptoDetail.push({
						text: `| ${childPrefix}\`-- ${pr.siblings[0]}`,
					});
				} else {
					cryptoDetail.push({
						text: `| ${childPrefix}\`-- ${pr.siblings.length} siblings:`,
					});
					for (let sIdx = 0; sIdx < pr.siblings.length; sIdx++) {
						const isLastSib = sIdx === pr.siblings.length - 1;
						const sibPrefix = isLastSib ? "`--" : "|--";
						cryptoDetail.push({
							text: `| ${childPrefix}   ${sibPrefix} ${pr.siblings[sIdx]}`,
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

	const ackLines: CompliancePdfLine[] = [];
	if (bundle.offChainEvidence.acknowledgements.length > 0) {
		ackLines.push(
			{
				text: "These entries were signed with EIP-712 off-chain; they are not implied by a transaction hash alone. Verify signatures against the wallets and commitments shown.",
			},
			{ text: "" },
			{ text: "Off-chain acknowledgements (EIP-712 validated; no chain tx):" },
			{ text: "" },
		);
		for (let i = 0; i < bundle.offChainEvidence.acknowledgements.length; i++) {
			const a = bundle.offChainEvidence.acknowledgements[i];
			ackLines.push({
				text: `${i + 1}. Wallet ${a.wallet} at ${a.createdAtIso}`,
			});
			ackLines.push({ text: `   emailCommitment: ${a.emailCommitment}` });
			if (a.privySubjectCommitment) {
				ackLines.push({
					text: `   privySubjectCommitment: ${a.privySubjectCommitment}`,
				});
			}
			if (a.ackSha256) {
				ackLines.push({ text: `   ackSha256: ${a.ackSha256}` });
			}
			if (i < bundle.offChainEvidence.acknowledgements.length - 1) {
				ackLines.push({ text: "" });
			}
		}
	}

	const appendixLines: CompliancePdfLine[] = buildAppendixLines();

	return {
		explorerBaseUrl,
		headerSubtitleLinkUri: explorerBaseUrl,
		fields,
		sections: [
			{ title: "About this record", lines: aboutLines },
			{ title: "Parties", lines: partiesLines },
			{ title: "On-chain registration snapshot", lines: onchainLines },
			{ title: "On-chain transactions (index)", lines: txIndexLines },
			{ title: "Signer matrix", lines: signerMatrix },
			{ title: "Document content metadata", lines: docMetaLines },
			{ title: "Field placements", lines: placementRef },
			{ title: "Placement manifest (JSON)", lines: manifestLines },
			{
				title: "Cryptographic completion proofs (Merkle trees)",
				lines: cryptoDetail,
			},
			...(ackLines.length > 0
				? [{ title: "Off-chain acknowledgements", lines: ackLines }]
				: []),
			{
				title: "Appendix: glossary and JSON field map",
				lines: appendixLines,
			},
		],
	};
}

// -----------------------------------------------------------------------------
// PDF drawing (layout & styling unchanged)
// -----------------------------------------------------------------------------

const A4 = { w: 595, h: 842 } as const;

// -----------------------------------------------------------------------------
// Brand colors (aligned with apps/astro/src/styles/global.css, print sRGB)
// -----------------------------------------------------------------------------

const PDF_BRAND = {
	pageBg: rgb(252 / 255, 253 / 255, 250 / 255),
	foreground: rgb(32 / 255, 34 / 255, 35 / 255),
	muted: rgb(112 / 255, 112 / 255, 113 / 255),
	border: rgb(217 / 255, 218 / 255, 222 / 255),
	accent: rgb(94 / 255, 143 / 255, 58 / 255),
	accentDark: rgb(58 / 255, 76 / 255, 33 / 255),
	link: rgb(18 / 255, 86 / 255, 120 / 255),
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
	fontBody: PDFFont;
	fontSectionTitle: PDFFont;
	fontBrand: PDFFont;
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
		ctx.page.drawRectangle({
			x: 0,
			y: 0,
			width: A4.w,
			height: A4.h,
			color: PDF_BRAND.pageBg,
		});
		ctx.y = ctx.ph - PDF_M.margin;
		ctx.page.drawLine({
			start: { x: PDF_M.margin, y: ctx.y + 6 },
			end: { x: ctx.pw - PDF_M.margin, y: ctx.y + 6 },
			thickness: 2,
			color: PDF_BRAND.accent,
		});
		ctx.page.drawText("filosign · compliance record (continued)", {
			x: PDF_M.margin,
			y: ctx.y,
			size: 8,
			font: ctx.fontBrand,
			color: PDF_BRAND.muted,
		});
		ctx.y -= lineHeightAt(ctx.fontBrand, 8) + PDF_M.gap;
	}
}

function drawWrappedLine(
	ctx: Ctx,
	x: number,
	maxW: number,
	line: CompliancePdfLine,
	size: number,
	defaultColor = PDF_BRAND.foreground,
): void {
	if (line.text === "") {
		ctx.y -= PDF_M.blankLineGap;
		return;
	}

	const isHex = line.display === "hex-dump";
	const targetFont = isHex ? ctx.fontMono : ctx.fontBody;
	const col = line.linkUri ? PDF_BRAND.link : defaultColor;
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
	const c2d = canvas.getContext("2d");
	if (!c2d) throw new Error("Could not create canvas context");
	c2d.drawImage(bitmap, 0, 0);
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

async function embedComplianceLogo(doc: PDFDocument): Promise<PDFImage | null> {
	try {
		const res = await fetch("/logo.webp");
		if (!res.ok) return null;
		const raw = new Uint8Array(await res.arrayBuffer());
		const png = await bytesToPngBytes(raw, "image/webp");
		return await doc.embedPng(png);
	} catch {
		return null;
	}
}

function drawPdfFooters(
	doc: PDFDocument,
	font: PDFFont,
	color: ReturnType<typeof rgb>,
): void {
	const pages = doc.getPages();
	const n = pages.length;
	const size = 7;
	for (let i = 0; i < n; i++) {
		const page = pages[i];
		const pw = page.getWidth();
		const text = `Filosign compliance record · Page ${i + 1} of ${n}`;
		const tw = font.widthOfTextAtSize(text, size);
		page.drawText(text, {
			x: (pw - tw) / 2,
			y: 32,
			size,
			font,
			color,
		});
	}
}

async function drawComplianceReport(
	doc: PDFDocument,
	options: CompliancePdfBundleOptions,
): Promise<void> {
	const summary = buildCompliancePdfSummaryFromBundle(options);
	const helvetica = await doc.embedFont(StandardFonts.Helvetica);
	const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
	const courier = await doc.embedFont(StandardFonts.Courier);

	const embedded = await loadCompliancePdfEmbeddedFonts(doc, {
		helvetica,
		helveticaBold,
		courier,
	});

	doc.setTitle("Filosign compliance and verification record");
	doc.setSubject(`Export ${options.exportId}`);
	doc.setCreator("Filosign");

	const firstPage = doc.addPage([A4.w, A4.h]);
	firstPage.drawRectangle({
		x: 0,
		y: 0,
		width: A4.w,
		height: A4.h,
		color: PDF_BRAND.pageBg,
	});

	const logoImg = await embedComplianceLogo(doc);

	const ctx: Ctx = {
		doc,
		page: firstPage,
		y: A4.h - PDF_M.margin,
		pw: firstPage.getWidth(),
		ph: firstPage.getHeight(),
		fontBody: embedded.body,
		fontSectionTitle: embedded.sectionTitle,
		fontBrand: embedded.brand,
		fontMono: embedded.mono,
	};

	const logoH = 40;
	if (logoImg) {
		const sc = logoH / logoImg.height;
		const lw = logoImg.width * sc;
		ctx.page.drawImage(logoImg, {
			x: PDF_M.margin,
			y: ctx.y - logoH,
			width: lw,
			height: logoH,
		});
		ctx.page.drawText("filosign", {
			x: PDF_M.margin + lw + 10,
			y: ctx.y - logoH * 0.32,
			size: 13,
			font: ctx.fontBrand,
			color: PDF_BRAND.accentDark,
		});
		ctx.y -= logoH + 10;
	} else {
		ctx.page.drawText("filosign", {
			x: PDF_M.margin,
			y: ctx.y,
			size: 13,
			font: ctx.fontBrand,
			color: PDF_BRAND.accentDark,
		});
		ctx.y -= lineHeightAt(ctx.fontBrand, 13) + 6;
	}

	ctx.page.drawText("Compliance and verification record", {
		x: PDF_M.margin,
		y: ctx.y,
		size: 18,
		font: ctx.fontSectionTitle,
		color: PDF_BRAND.foreground,
	});
	ctx.y -= lineHeightAt(ctx.fontSectionTitle, 18) + 4;

	const subParts = [
		options.chainName,
		`chain id ${options.bundle.chainId}`,
		`exported ${options.bundle.exportedAtIso}`,
	];
	ctx.page.drawText(subParts.join(" · "), {
		x: PDF_M.margin,
		y: ctx.y,
		size: 9,
		font: ctx.fontBody,
		color: PDF_BRAND.muted,
	});
	ctx.y -= lineHeightAt(ctx.fontBody, 9) + 10;

	if (summary.explorerBaseUrl) {
		const subText = `Block explorer: ${summary.explorerBaseUrl}`;
		ctx.page.drawText(subText, {
			x: PDF_M.margin,
			y: ctx.y,
			size: 9,
			font: ctx.fontBody,
			color: PDF_BRAND.link,
		});
		if (summary.headerSubtitleLinkUri) {
			addUriLink(
				ctx.page,
				PDF_M.margin,
				ctx.y,
				subText,
				9,
				ctx.fontBody,
				summary.headerSubtitleLinkUri,
			);
		}
		ctx.y -= lineHeightAt(ctx.fontBody, 9) + 8;
	}

	ctx.page.drawLine({
		start: { x: PDF_M.margin, y: ctx.y },
		end: { x: ctx.pw - PDF_M.margin, y: ctx.y },
		thickness: 2.5,
		color: PDF_BRAND.accent,
	});
	ctx.y -= PDF_M.gap + 6;

	ctx.page.drawText("Key identifiers and anchors", {
		x: PDF_M.margin,
		y: ctx.y,
		size: PDF_M.sectionTitleSize + 1,
		font: ctx.fontSectionTitle,
		color: PDF_BRAND.accentDark,
	});
	ctx.y -=
		lineHeightAt(ctx.fontSectionTitle, PDF_M.sectionTitleSize + 1) +
		PDF_M.sectionTitleBottomPad;

	const valueMaxW = ctx.pw - PDF_M.valueX - PDF_M.margin;

	for (const row of summary.fields) {
		const vLines = wrapLines(
			row.value,
			valueMaxW,
			ctx.fontBody,
			PDF_M.bodySize,
		);
		const lh = lineHeightAt(ctx.fontBody, PDF_M.bodySize);
		const valueTotalH = vLines.length * lh;
		const labelH = lineHeightAt(ctx.fontSectionTitle, PDF_M.labelSize);
		const rowH = Math.max(labelH, valueTotalH);
		const blockPad = PDF_M.fieldLabelValueGap;

		ensureSpace(ctx, rowH + blockPad + PDF_M.fieldRowGapAfterRule + 8);

		ctx.page.drawText(row.label, {
			x: PDF_M.margin,
			y: ctx.y,
			size: PDF_M.labelSize,
			font: ctx.fontSectionTitle,
			color: PDF_BRAND.muted,
		});

		let vy = ctx.y;
		for (const vl of vLines) {
			const vc = row.linkUri ? PDF_BRAND.link : PDF_BRAND.foreground;
			ctx.page.drawText(vl, {
				x: PDF_M.valueX,
				y: vy,
				size: PDF_M.bodySize,
				font: ctx.fontBody,
				color: vc,
			});
			if (row.linkUri) {
				addUriLink(
					ctx.page,
					PDF_M.valueX,
					vy,
					vl,
					PDF_M.bodySize,
					ctx.fontBody,
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
			color: PDF_BRAND.border,
		});
		ctx.y -= PDF_M.fieldRowGapAfterRule;
	}

	ctx.y -= PDF_M.sectionGap;

	const bodyMaxW = ctx.pw - PDF_M.margin * 2;

	for (const section of summary.sections) {
		const sectionTitleH = lineHeightAt(
			ctx.fontSectionTitle,
			PDF_M.sectionTitleSize + 1,
		);
		ensureSpace(ctx, sectionTitleH + PDF_M.sectionTitleBottomPad + 16);

		ctx.page.drawText(section.title, {
			x: PDF_M.margin,
			y: ctx.y,
			size: PDF_M.sectionTitleSize + 1,
			font: ctx.fontSectionTitle,
			color: PDF_BRAND.accentDark,
		});
		ctx.y -= sectionTitleH + 4;
		ctx.page.drawLine({
			start: { x: PDF_M.margin, y: ctx.y },
			end: { x: ctx.pw - PDF_M.margin, y: ctx.y },
			thickness: 1,
			color: PDF_BRAND.accent,
		});
		ctx.y -= PDF_M.sectionTitleBottomPad + 4;

		for (const line of section.lines) {
			drawWrappedLine(ctx, PDF_M.margin, bodyMaxW, line, PDF_M.bodySize);
		}
		ctx.y -= PDF_M.sectionGap;
	}

	drawPdfFooters(doc, ctx.fontBody, PDF_BRAND.muted);
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
	placementManifest: PlacementManifest,
	signers: ComplianceBundle["signers"],
): Promise<void> {
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
	const n = doc.getPageCount();

	for (const f of placementManifest.fields) {
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

		const st = fieldPlacementStatusFromSigners(
			signers,
			f.id,
			f.assignedRecipientEmail,
		);
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

		const signerRow = signers.find(
			(s) =>
				s.email &&
				s.email.trim().toLowerCase() ===
					f.assignedRecipientEmail.trim().toLowerCase(),
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
			await drawPlacementOverlaysOnDocumentPdf(
				out,
				options.bundle.placementManifest,
				options.bundle.signers,
			);
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
		await drawPlacementOverlaysOnDocumentPdf(
			out,
			options.bundle.placementManifest,
			options.bundle.signers,
		);
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
