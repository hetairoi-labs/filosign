import { useAuthedApi, useSendFile } from "@filosign/react/hooks";
import { useQueries } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Address } from "viem";
import z from "zod";

import { useStorePersist } from "@/src/lib/hooks/use-store";
import { cn } from "@/src/lib/utils/utils";
import DocumentViewer from "./_components/DocumentViewer";
import Header from "./_components/Header";
import MobileSignatureToolbar from "./_components/MobileSignatureToolbar";
import SignatureFieldsSidebar from "./_components/SignatureFieldsSidebar";
import {
	type Document,
	fieldTypeConfigs,
	mockDocuments,
	type SignatureField,
} from "./mock";

export default function AddSignaturePage() {
	const navigate = useNavigate();
	const { createForm, clearCreateForm } = useStorePersist();
	const sendFile = useSendFile();
	const { data: api } = useAuthedApi();

	// Fetch profiles for all recipients using SDK pattern (replicating useUserProfileByQuery)
	const recipientProfileQueries = useQueries({
		queries:
			createForm?.recipients?.map((recipient) => ({
				queryKey: [
					"fsQ-user-info-by-address",
					{ address: recipient.walletAddress },
				],
				queryFn: async () => {
					if (!api || !recipient.walletAddress) return null;
					try {
						// Replicate the SDK's useUserProfileByQuery query function
						const userInfo = await api.rpc.getSafe(
							{
								walletAddress: z.string(),
								encryptionPublicKey: z.string(),
								lastActiveAt: z.string(),
								createdAt: z.string(),
								firstName: z.string().nullable(),
								lastName: z.string().nullable(),
								avatarUrl: z.string().nullable(),
								has: z.object({
									email: z.boolean(),
									mobile: z.boolean(),
								}),
							},
							`/users/profile/${recipient.walletAddress}`,
						);
						return {
							recipient,
							profile: userInfo.data,
						};
					} catch (error) {
						console.error(
							`Failed to fetch profile for ${recipient.walletAddress}:`,
							error,
						);
						return null;
					}
				},
				enabled: !!api && !!recipient.walletAddress,
			})) || [],
	});

	// Map recipient profiles by wallet address
	const recipientProfilesMap = useMemo(() => {
		const map = new Map<
			Address,
			{
				recipient: {
					name: string;
					email: string;
					walletAddress: string;
					role: string;
				};
				profile: {
					walletAddress: string;
					encryptionPublicKey: string;
					lastActiveAt: string;
					createdAt: string;
					firstName: string | null;
					lastName: string | null;
					avatarUrl: string | null;
					has: { email: boolean; mobile: boolean };
				};
			}
		>();
		createForm?.recipients?.forEach((recipient, index) => {
			const profileQuery = recipientProfileQueries[index];
			if (profileQuery?.data) {
				map.set(recipient.walletAddress as Address, profileQuery.data);
			}
		});
		return map;
	}, [createForm?.recipients, recipientProfileQueries]);

	const [currentDocumentId, setCurrentDocumentId] = useState<string>("");
	const [currentPage, setCurrentPage] = useState(1);
	const [zoom, setZoom] = useState(100);
	const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
	const [selectedField, setSelectedField] = useState<string | null>(null);
	const [isPlacingField, setIsPlacingField] = useState(false);
	const [pendingFieldType, setPendingFieldType] = useState<
		SignatureField["type"] | null
	>(null);

	// Convert createForm documents to Document format
	const documents: Document[] = createForm?.documents?.length
		? createForm.documents.map((doc) => ({
				id: doc.id,
				name: doc.name,
				url: doc.dataUrl || "",
				pages: 1, // For now, assume 1 page per document
			}))
		: mockDocuments;

	// Set initial document if not set
	React.useEffect(() => {
		if (documents.length > 0 && !currentDocumentId) {
			setCurrentDocumentId(documents[0].id);
		}
	}, [documents, currentDocumentId]);

	const currentDocument: Document | undefined = documents.find(
		(doc) => doc.id === currentDocumentId,
	);

	// Local utility function for generating unique IDs
	const generateFieldId = () => Math.random().toString(36).substr(2, 9);

	const handleAddField = (fieldType: SignatureField["type"]) => {
		setPendingFieldType(fieldType);
		setIsPlacingField(true);
		setSelectedField(null); // Clear any selected field when starting to place a new one
	};

	const handleFieldPlaced = (x: number, y: number) => {
		if (!pendingFieldType || !currentDocumentId) return;

		const fieldConfig = fieldTypeConfigs.find(
			(config) => config.type === pendingFieldType,
		);
		if (!fieldConfig) return;

		const newField: SignatureField = {
			id: generateFieldId(),
			type: pendingFieldType,
			x,
			y,
			page: currentPage,
			documentId: currentDocumentId,
			required: true,
			label: fieldConfig.label,
		};

		setSignatureFields((prev) => [...prev, newField]);
		setIsPlacingField(false);
		setPendingFieldType(null);
	};

	const handleFieldSelect = (fieldId: string) => {
		setSelectedField(fieldId);
	};

	const handleFieldRemove = (fieldId: string) => {
		setSignatureFields((prev) => prev.filter((field) => field.id !== fieldId));
		if (selectedField === fieldId) {
			setSelectedField(null);
		}
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

	const handleBack = () => {
		navigate({ to: "/dashboard/envelope/create" });
	};

	const handleSend = async () => {
		if (!createForm || !createForm.documents.length) {
			toast.error("No documents to send");
			return;
		}

		if (!createForm.recipients || createForm.recipients.length === 0) {
			toast.error("No recipients selected");
			return;
		}

		// Check if all recipient profiles are loaded
		const missingProfiles = createForm.recipients.filter(
			(r) => !recipientProfilesMap.has(r.walletAddress as Address),
		);
		if (missingProfiles.length > 0) {
			toast.error("Loading recipient information...");
			return;
		}

		// Check if any queries are still loading
		const isLoading = recipientProfileQueries.some((query) => query.isLoading);
		if (isLoading) {
			toast.error("Loading recipient information...");
			return;
		}

		try {
			toast.loading("Sending documents...", { id: "send-progress" });

			// Send each document to all recipients
			const sendPromises = [];
			for (const doc of createForm.documents) {
				// Convert data URL back to file
				const response = await fetch(doc.dataUrl);
				const blob = await response.blob();
				const file = new File([blob], doc.name, { type: doc.type });
				const fileData = new Uint8Array(await file.arrayBuffer());

				// Separate recipients into signers and viewers based on role
				const signers: {
					address: Address;
					encryptionPublicKey: `0x${string}`;
					signaturePosition: [number, number, number, number];
				}[] = [];
				const viewers: { address: Address; encryptionPublicKey: string }[] = [];

				// Get signature positions for this document, grouped by recipient
				const documentSignatures = signatureFields.filter(
					(field) => field.documentId === doc.id && field.type === "signature",
				);

				// Process each recipient
				for (const recipient of createForm.recipients) {
					const recipientData = recipientProfilesMap.get(
						recipient.walletAddress as Address,
					);
					if (!recipientData) continue;

					const { profile } = recipientData;
					const address = recipient.walletAddress as Address;
					const encryptionPublicKey =
						profile.encryptionPublicKey as `0x${string}`;

					// Find signature fields for this recipient (if we had recipient-specific fields)
					// For now, assign signature positions sequentially to signers
					if (recipient.role === "signer") {
						// Find the signature field index for this signer
						const signerIndex = createForm.recipients
							.filter((r) => r.role === "signer")
							.findIndex((r) => r.walletAddress === recipient.walletAddress);

						// Get signature position for this signer, or use default
						const signatureField =
							documentSignatures[signerIndex] || documentSignatures[0];
						const signaturePosition: [number, number, number, number] =
							signatureField
								? [
										signatureField.x,
										signatureField.y,
										200, // width
										100, // height
									]
								: [10, 10, 200, 100]; // Default position

						signers.push({
							address,
							encryptionPublicKey,
							signaturePosition,
						});
					} else if (recipient.role === "cc" || recipient.role === "approver") {
						viewers.push({
							address,
							encryptionPublicKey,
						});
					}
				}

				// Ensure we have at least one signer
				if (signers.length === 0) {
					toast.error("At least one signer is required");
					return;
				}

				const sendData = {
					signers,
					viewers,
					bytes: fileData,
					metadata: {
						name: doc.name,
						mimeType: doc.type,
					},
				};

				console.log("Sending document:", {
					documentName: doc.name,
					documentSize: fileData.length,
					signersCount: signers.length,
					viewersCount: viewers.length,
					sendData: { ...sendData, bytes: `[${fileData.length} bytes]` }, // Don't log the actual bytes
				});

				sendPromises.push(sendFile.mutateAsync(sendData));
			}

			await Promise.all(sendPromises);

			// Clear form data
			clearCreateForm();

			toast.success("Documents sent successfully!", {
				id: "send-progress",
			});

			// Navigate back to dashboard
			navigate({ to: "/dashboard" });
		} catch (error) {
			console.error("Failed to send documents:", error);
			toast.error("Failed to send documents. Please try again.", {
				id: "send-progress",
			});
		}
	};

	const currentPageFields = signatureFields.filter(
		(field) =>
			field.documentId === currentDocumentId && field.page === currentPage,
	);

	const handleDocumentSelect = (documentId: string) => {
		setCurrentDocumentId(documentId);
		setCurrentPage(1);
		setSelectedField(null);
	};

	return (
		<div className="min-h-screen bg-background flex flex-col">
			<Header onSend={handleSend} />

			{/* Main Content */}
			<div className="flex flex-1">
				{/* Left Sidebar - Signature Fields */}
				<aside className="hidden lg:block w-64 border-r border-border bg-muted/5">
					<SignatureFieldsSidebar
						onAddField={handleAddField}
						isPlacingField={isPlacingField}
						pendingFieldType={pendingFieldType}
					/>
				</aside>

				{/* Document Viewer */}
				<main className="flex-1 flex flex-col bg-background">
					{currentDocument ? (
						<DocumentViewer
							document={currentDocument || null}
							zoom={zoom}
							signatureFields={currentPageFields}
							selectedField={selectedField}
							isPlacingField={isPlacingField}
							pendingFieldType={pendingFieldType}
							onFieldPlaced={handleFieldPlaced}
							onFieldSelect={handleFieldSelect}
							onFieldRemove={handleFieldRemove}
							onFieldUpdate={handleFieldUpdate}
							onZoomChange={setZoom}
							onBack={handleBack}
						/>
					) : (
						<div className="flex-1 flex items-center justify-center">
							<div className="text-center">
								<p className="text-muted-foreground">No documents available</p>
							</div>
						</div>
					)}
				</main>

				{/* Right Sidebar - Document Thumbnails */}
				<aside className="hidden lg:block w-48 border-l border-border p-4 z-20 bg-background">
					<div className="space-y-4">
						<p className="font-medium text-muted-foreground">Documents</p>
						<div className="space-y-2">
							{documents.map((doc) => (
								<div
									key={doc.id}
									className={cn(
										"aspect-[3/4] bg-muted rounded border-2 cursor-pointer transition-colors relative",
										currentDocumentId === doc.id
											? "border-primary bg-primary/5"
											: "border-border hover:border-muted-foreground/50",
									)}
									onClick={() => handleDocumentSelect(doc.id)}
								>
									{/* Document preview */}
									{doc.url ? (
										doc.url.startsWith("data:application/pdf") ||
										doc.name?.toLowerCase().endsWith(".pdf") ? (
											<div className="absolute inset-0 flex items-center justify-center bg-red-50">
												<div className="text-xs text-destructive font-medium">
													PDF
												</div>
											</div>
										) : (
											<img
												src={doc.url}
												alt={doc.name}
												className="absolute inset-0 w-full h-full object-cover rounded"
											/>
										)
									) : (
										<div className="absolute inset-0 flex items-center justify-center">
											<div className="text-xs text-muted-foreground">
												No preview
											</div>
										</div>
									)}

									{/* Document name overlay */}
									<div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 rounded-b">
										<div className="text-xs truncate" title={doc.name}>
											{doc.name}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</aside>
			</div>

			{/* Mobile Signature Toolbar */}
			<MobileSignatureToolbar
				onAddField={handleAddField}
				isPlacingField={isPlacingField}
				pendingFieldType={pendingFieldType}
			/>
		</div>
	);
}
