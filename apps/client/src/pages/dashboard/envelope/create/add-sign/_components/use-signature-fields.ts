import { useState } from "react";
import { createClientId } from "@/src/lib/utils/id";
import type { SignatureField } from "../mock";

export function useSignatureFields() {
	const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
	const [selectedField, setSelectedField] = useState<string | null>(null);
	const [isPlacingField, setIsPlacingField] = useState(false);
	const [pendingFieldType, setPendingFieldType] = useState<
		SignatureField["type"] | null
	>(null);

	const handleAddField = (fieldType: SignatureField["type"]) => {
		setPendingFieldType(fieldType);
		setIsPlacingField(true);
		setSelectedField(null);
	};

	const handleFieldPlaced = (
		x: number,
		y: number,
		currentPage: number,
		currentDocumentId: string,
		label: string,
	) => {
		if (!pendingFieldType || !currentDocumentId) return;
		const newField: SignatureField = {
			id: createClientId(),
			type: pendingFieldType,
			x,
			y,
			page: currentPage,
			documentId: currentDocumentId,
			required: true,
			label,
		};
		setSignatureFields((prev) => [...prev, newField]);
		setIsPlacingField(false);
		setPendingFieldType(null);
	};

	const handleFieldRemove = (fieldId: string) => {
		setSignatureFields((prev) => prev.filter((field) => field.id !== fieldId));
		setSelectedField((prev) => (prev === fieldId ? null : prev));
	};

	const handleFieldUpdate = (
		fieldId: string,
		updates: Partial<SignatureField>,
	) => {
		setSignatureFields((prev) =>
			prev.map((field) =>
				field.id === fieldId ? { ...field, ...updates } : field,
			),
		);
	};

	return {
		signatureFields,
		selectedField,
		isPlacingField,
		pendingFieldType,
		setSelectedField,
		handleAddField,
		handleFieldPlaced,
		handleFieldRemove,
		handleFieldUpdate,
	};
}
