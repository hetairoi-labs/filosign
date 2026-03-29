import {
	useProfilesByAddresses,
	useRpSignature,
	useSendFile,
} from "@filosign/react/hooks";
import { usePrivy } from "@privy-io/react-auth";
import { useNavigate } from "@tanstack/react-router";
import type { IDKitResult, RpContext } from "@worldcoin/idkit";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Address } from "viem";

import { useStorePersist } from "@/src/lib/hooks/use-store";
import { cn } from "@/src/lib/utils/utils";
import DocumentViewer, {
	useDocumentDimensions,
} from "./_components/DocumentViewer";
import Header from "./_components/Header";
import MobileSignatureToolbar from "./_components/MobileSignatureToolbar";
import SignatureFieldsSidebar from "./_components/SignatureFieldsSidebar";
import { WorldIDKitSign } from "./_components/WorldIDKitSign";
import {
	type Document,
	fieldTypeConfigs,
	mockDocuments,
	type SignatureField,
} from "./mock";
import {
	buildSignersAndViewersForDocument,
	loadDocumentFileBytes,
	type RecipientWithEncryptionProfile,
	SendEnvelopeError,
} from "./send-envelope";

export default function AddSignaturePage() {
	const navigate = useNavigate();
	const { createForm, clearCreateForm } = useStorePersist();
	const sendFile = useSendFile();
	const { user } = usePrivy();
	const getRpContext = useRpSignature();
	const userAddress = user?.wallet?.address as `0x${string}` | undefined;

	const [idKitOpen, setIdKitOpen] = useState(false);
	const [idKitRp, setIdKitRp] = useState<RpContext | null>(null);

	const recipientAddresses = useMemo(
		() => createForm?.recipients?.map((r) => r.walletAddress as Address) ?? [],
		[createForm?.recipients],
	);
	const { data: recipientProfilesMap, isLoading: recipientProfilesLoading } =
		useProfilesByAddresses(
			recipientAddresses.length > 0 ? recipientAddresses : undefined,
		);

	// Build recipient + profile map for template
	const recipientProfilesMapWithRecipient = useMemo(() => {
		const map = new Map<
			Address,
			{
				recipient: {
					name: string;
					email: string;
					walletAddress: string;
					role: string;
				};
				profile: { encryptionPublicKey: string; [key: string]: unknown };
			}
		>();
		createForm?.recipients?.forEach((recipient) => {
			const profile = recipientProfilesMap?.get(
				recipient.walletAddress as Address,
			);
			if (profile) {
				map.set(recipient.walletAddress as Address, {
					recipient,
					profile: profile as {
						encryptionPublicKey: string;
						[key: string]: unknown;
					},
				});
			}
		});
		return map;
	}, [createForm?.recipients, recipientProfilesMap]);

	const { width: docWidth, height: docHeight } = useDocumentDimensions();
	const [currentDocumentId, setCurrentDocumentId] = useState<string>("");
	const [currentPage, setCurrentPage] = useState(1);
	const [zoom, setZoom] = useState(100);
	const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
	const [selectedField, setSelectedField] = useState<string | null>(null);
	const [isPlacingField, setIsPlacingField] = useState(false);
	const [pendingFieldType, setPendingFieldType] = useState<
		SignatureField["type"] | null
	>(null);
	const isSendingRef = useRef(false);

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

	const executeEnvelopeSend = useCallback(
		async (proof: IDKitResult) => {
			if (!createForm) return;

			// When POST /files accepts `worldIdProof`, pass `proof` into `sendFile.mutateAsync`.
			void proof;

			isSendingRef.current = true;
			toast.loading("Sending documents...", { id: "send-progress" });

			try {
				const sendPromises: Promise<unknown>[] = [];

				for (const doc of createForm.documents) {
					const fileData = await loadDocumentFileBytes(doc);

					const { signers, viewers } = buildSignersAndViewersForDocument({
						docId: doc.id,
						recipients: createForm.recipients,
						recipientMap: recipientProfilesMapWithRecipient as Map<
							Address,
							RecipientWithEncryptionProfile
						>,
						signatureFields,
						docWidth,
						docHeight,
					});

					if (signers.length === 0) {
						toast.error("At least one signer is required");
						throw new Error(SendEnvelopeError.NO_SIGNERS);
					}

					sendPromises.push(
						sendFile.mutateAsync({
							signers,
							viewers,
							bytes: fileData,
							metadata: { name: doc.name },
						}),
					);
				}

				await Promise.all(sendPromises);

				clearCreateForm();

				toast.success("Documents sent successfully!", {
					id: "send-progress",
				});

				setIdKitOpen(false);
				setIdKitRp(null);
				navigate({ to: "/dashboard" });
			} catch (error) {
				if (
					error instanceof Error &&
					error.message === SendEnvelopeError.MISSING_DATA_URL
				) {
					toast.dismiss("send-progress");
					toast.error("Document is missing file data");
					return;
				}
				if (
					error instanceof Error &&
					error.message === SendEnvelopeError.NO_SIGNERS
				) {
					toast.dismiss("send-progress");
					return;
				}
				console.error("Failed to send documents:", error);
				toast.error("Failed to send documents. Please try again.", {
					id: "send-progress",
				});
			} finally {
				isSendingRef.current = false;
			}
		},
		[
			createForm,
			sendFile,
			signatureFields,
			docWidth,
			docHeight,
			recipientProfilesMapWithRecipient,
			clearCreateForm,
			navigate,
		],
	);

	const handleSend = async () => {
		if (isSendingRef.current) {
			toast.info("Already sending documents...");
			return;
		}

		if (!createForm || !createForm.documents.length) {
			toast.error("No documents to send");
			return;
		}

		if (!createForm.recipients || createForm.recipients.length === 0) {
			toast.error("No recipients selected");
			return;
		}

		if (!userAddress) {
			toast.error("Connect your wallet to continue");
			return;
		}

		if (recipientProfilesLoading) {
			toast.error("Loading recipient information...");
			return;
		}

		const missingProfiles = createForm.recipients.filter(
			(r) => !recipientProfilesMapWithRecipient.has(r.walletAddress as Address),
		);
		if (missingProfiles.length > 0) {
			toast.error(
				"Could not load all recipient profiles. Please try again in a moment.",
			);
			return;
		}

		try {
			const linkAction = process.env.BUN_PUBLIC_WORLD_ACTION;
			if (!linkAction) {
				toast.error("World ID is not configured");
				return;
			}
			const ctx = await getRpContext.mutateAsync({ action: linkAction });
			setIdKitRp(ctx);
			setIdKitOpen(true);
		} catch {
			toast.error("Failed to prepare verification");
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
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											handleDocumentSelect(doc.id);
										}
									}}
									role="button"
									tabIndex={0}
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

			{userAddress ? (
				<WorldIDKitSign
					signerAddress={userAddress}
					hideTrigger
					open={idKitOpen}
					onOpenChange={(next) => {
						setIdKitOpen(next);
						if (!next) setIdKitRp(null);
					}}
					rpContext={idKitRp}
					onProofSuccess={(proof) => executeEnvelopeSend(proof)}
				/>
			) : null}
		</div>
	);
}
