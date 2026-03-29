import type { FileInfo, ViewFileResult } from "@filosign/react/hooks";

/** Options for {@link buildCompliancePdfSummary} (same shape as PDF export helpers). */
export type CompliancePdfSummaryOptions = {
	file: FileInfo;
	fileData: ViewFileResult | null;
	chainName: string;
	explorerBaseUrl: string | null;
	exportedAtIso: string;
	/** Optional mapping of wallet address → Privy User ID */
	privyIdMap?: Record<string, string>;
};

/** One logical line in the PDF (optional clickable URI for the drawn text). */
export type CompliancePdfLine = {
	text: string;
	/** When set, a PDF link annotation is added over this text's bounds. */
	linkUri?: string | null;
	/**
	 * Dense hex strings: pdf-lib cannot wrap a single "word" that exceeds line width;
	 * pre-chunk into a monospace-style dump so every line fits.
	 */
	display?: "hex-dump";
};

export type CompliancePdfSummary = {
	explorerBaseUrl: string | null;
	/** Full explorer base URL for clickable header link. */
	headerSubtitleLinkUri: string | null;
	fields: Array<{
		label: string;
		value: string;
		linkUri?: string | null;
	}>;
	sections: Array<{ title: string; lines: CompliancePdfLine[] }>;
};

function explorerTxUrl(explorerBase: string, txHash: string): string {
	const base = explorerBase.replace(/\/$/, "");
	return `${base}/tx/${txHash}`;
}

/**
 * Full compliance payload for PDF: complete values for verification (no truncation).
 * Explorer transaction URLs are exposed separately for clickable links in the PDF.
 */
export function buildCompliancePdfSummary(
	options: CompliancePdfSummaryOptions,
): CompliancePdfSummary {
	const { file, fileData, chainName, explorerBaseUrl, exportedAtIso, privyIdMap } = options;

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
		participantLines.push({ text: privy ? `  - ${a} (Privy: ${privy})` : `  - ${a}` });
	}
	participantLines.push({ text: "" });
	participantLines.push({ text: `Viewers (${file.viewers.length}):` });
	for (const a of file.viewers) {
		const privy = privyIdMap?.[a];
		participantLines.push({ text: privy ? `  - ${a} (Privy: ${privy})` : `  - ${a}` });
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
			sigLines.push({ text: `  Signer: ${sig.signer}` });
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
