import type { PlacementManifest } from "@filosign/shared";
import { getAddress, type Address } from "viem";
import type { StoredDocument } from "../types";
import type { SignatureField } from "./mock";

/** Thrown from {@link loadDocumentFileBytes}; match in `handleSend` catch. */
export const SendEnvelopeError = {
	MISSING_DATA_URL: "MISSING_DATA_URL",
	NO_SIGNERS: "NO_SIGNERS",
} as const;

/** Matches persisted create-form map entries (role may be typed as `string` in UI state). */
export type RecipientWithEncryptionProfile = {
	recipient: {
		name: string;
		email: string;
		walletAddress: string;
		role: string;
	};
	profile: { encryptionPublicKey: string; [key: string]: unknown };
};

export type EnvelopeSigner = {
	address: Address;
	encryptionPublicKey: `0x${string}`;
};

export type EnvelopeViewer = {
	address: Address;
	encryptionPublicKey: string;
};

function clamp01(n: number): number {
	return Math.min(1, Math.max(0, n));
}

/**
 * Build v1 {@link PlacementManifest} for a document: normalized rects and
 * per-field {@link SignatureField.assignedSignerWallet} / {@link SignatureField.required}.
 */
export function buildPlacementManifestForDocument(args: {
	docId: string;
	signersOrder: Address[];
	signatureFields: SignatureField[];
	docWidth: number;
	docHeight: number;
}): PlacementManifest {
	const { docId, signersOrder, signatureFields, docWidth, docHeight } = args;
	const dw = Math.max(docWidth, 1);
	const dh = Math.max(docHeight, 1);

	if (signersOrder.length === 0) {
		throw new Error("At least one signer is required for placement");
	}

	const fieldsForDoc = signatureFields.filter((f) => f.documentId === docId);
	if (fieldsForDoc.length === 0) {
		throw new Error("Add at least one field to the document before sending");
	}

	const signerSet = new Set(
		signersOrder.map((a) => getAddress(a).toLowerCase() as string),
	);

	const manifestFields: PlacementManifest["fields"] = [];

	for (const field of fieldsForDoc) {
		const assigned = getAddress(field.assignedSignerWallet);
		if (!signerSet.has(assigned.toLowerCase())) {
			throw new Error(
				`Field ${field.id}: assigned signer ${assigned} is not in this envelope's signer list`,
			);
		}

		manifestFields.push({
			id: field.id,
			pageIndex: Math.max(0, field.page - 1),
			rect: {
				x: clamp01(field.x / dw),
				y: clamp01(field.y / dh),
				width: clamp01(200 / dw),
				height: clamp01(100 / dh),
			},
			assignedSigner: assigned,
			required: field.required,
			type: field.type,
		});
	}

	return { version: 1, fields: manifestFields };
}

/** Data URL → bytes for {@link useSendFile}. Parses directly (no fetch) to satisfy strict CSP. */
export async function loadDocumentFileBytes(
	doc: StoredDocument,
): Promise<Uint8Array> {
	if (!doc.dataUrl) {
		throw new Error(SendEnvelopeError.MISSING_DATA_URL);
	}
	const url = doc.dataUrl;
	if (url.startsWith("data:")) {
		const commaIdx = url.indexOf(",");
		if (commaIdx === -1) throw new Error("Invalid data URL");
		const meta = url.slice(5, commaIdx); // e.g., "application/pdf;base64"
		const payload = url.slice(commaIdx + 1);
		if (meta.includes("base64")) {
			const binaryStr = atob(payload);
			const bytes = new Uint8Array(binaryStr.length);
			for (let i = 0; i < binaryStr.length; i++) {
				bytes[i] = binaryStr.charCodeAt(i);
			}
			return bytes;
		}
		// URL-encoded fallback (not base64)
		const decoded = decodeURIComponent(payload);
		return new Uint8Array(
			Array.from(decoded).map((c) => c.charCodeAt(0)),
		);
	}
	// For non-data URLs, fetch is still allowed by CSP (http/https)
	const response = await fetch(url);
	const blob = await response.blob();
	const file = new File([blob], doc.name, { type: doc.type });
	return new Uint8Array(await file.arrayBuffer());
}

/**
 * Splits envelope recipients into signers vs viewers (recipient order among
 * signers is stable for placement assignment).
 */
export function buildSignersAndViewersForDocument(args: {
	recipients: RecipientWithEncryptionProfile["recipient"][];
	recipientMap: Map<Address, RecipientWithEncryptionProfile>;
}): { signers: EnvelopeSigner[]; viewers: EnvelopeViewer[] } {
	const { recipients, recipientMap } = args;

	const signers: EnvelopeSigner[] = [];
	const viewers: EnvelopeViewer[] = [];

	for (const recipient of recipients) {
		const recipientData = recipientMap.get(recipient.walletAddress as Address);
		if (!recipientData) continue;

		const { profile } = recipientData;
		const address = recipient.walletAddress as Address;
		const encryptionPublicKey = profile.encryptionPublicKey as `0x${string}`;

		if (recipient.role === "signer") {
			signers.push({
				address,
				encryptionPublicKey,
			});
		} else {
			viewers.push({
				address,
				encryptionPublicKey,
			});
		}
	}

	return { signers, viewers };
}
