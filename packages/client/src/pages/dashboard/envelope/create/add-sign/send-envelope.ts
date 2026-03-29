import type { Address } from "viem";
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
	signaturePosition: [number, number, number, number];
};

export type EnvelopeViewer = {
	address: Address;
	encryptionPublicKey: string;
};

function clampPercent(v: number): number {
	return Math.max(0.01, Math.min(99.99, v));
}

/**
 * `encodeFileData` expects signature box as percentages (0–100 exclusive);
 * coordinates come from viewer pixels vs document dimensions.
 */
function signaturePositionForSigner(
	signatureField: SignatureField | undefined,
	docWidth: number,
	docHeight: number,
): [number, number, number, number] {
	if (signatureField) {
		return [
			clampPercent((signatureField.x / docWidth) * 100),
			clampPercent((signatureField.y / docHeight) * 100),
			clampPercent((200 / docWidth) * 100),
			clampPercent((100 / docHeight) * 100),
		];
	}
	return [
		clampPercent((10 / docWidth) * 100),
		clampPercent((10 / docHeight) * 100),
		clampPercent((200 / docWidth) * 100),
		clampPercent((100 / docHeight) * 100),
	];
}

/** Data URL → bytes for {@link useSendFile}. */
export async function loadDocumentFileBytes(
	doc: StoredDocument,
): Promise<Uint8Array> {
	if (!doc.dataUrl) {
		throw new Error(SendEnvelopeError.MISSING_DATA_URL);
	}
	const response = await fetch(doc.dataUrl);
	const blob = await response.blob();
	const file = new File([blob], doc.name, { type: doc.type });
	return new Uint8Array(await file.arrayBuffer());
}

/**
 * Splits envelope recipients into signers vs viewers and maps signature fields
 * to on-document positions for each signer (by signer order among signers only).
 */
export function buildSignersAndViewersForDocument(args: {
	docId: string;
	recipients: RecipientWithEncryptionProfile["recipient"][];
	recipientMap: Map<Address, RecipientWithEncryptionProfile>;
	signatureFields: SignatureField[];
	docWidth: number;
	docHeight: number;
}): { signers: EnvelopeSigner[]; viewers: EnvelopeViewer[] } {
	const {
		docId,
		recipients,
		recipientMap,
		signatureFields,
		docWidth,
		docHeight,
	} = args;

	const signers: EnvelopeSigner[] = [];
	const viewers: EnvelopeViewer[] = [];

	const documentSignatures = signatureFields.filter(
		(field) => field.documentId === docId && field.type === "signature",
	);

	for (const recipient of recipients) {
		const recipientData = recipientMap.get(recipient.walletAddress as Address);
		if (!recipientData) continue;

		const { profile } = recipientData;
		const address = recipient.walletAddress as Address;
		const encryptionPublicKey = profile.encryptionPublicKey as `0x${string}`;

		if (recipient.role === "signer") {
			const signerIndex = recipients
				.filter((r) => r.role === "signer")
				.findIndex((r) => r.walletAddress === recipient.walletAddress);

			const signatureField =
				documentSignatures[signerIndex] || documentSignatures[0];

			signers.push({
				address,
				encryptionPublicKey,
				signaturePosition: signaturePositionForSigner(
					signatureField,
					docWidth,
					docHeight,
				),
			});
		} else if (recipient.role === "cc" || recipient.role === "approver") {
			viewers.push({
				address,
				encryptionPublicKey,
			});
		}
	}

	return { signers, viewers };
}
