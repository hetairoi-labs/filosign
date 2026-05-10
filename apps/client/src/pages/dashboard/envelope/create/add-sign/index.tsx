import {
	useAttachIncentiveToFile,
	useProfilesByAddresses,
	useSendFile,
} from "@filosign/react/hooks";
import { useNavigate } from "@tanstack/react-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type Address, getAddress, parseUnits } from "viem";

import { SUPPORTED_TOKENS } from "@/src/constants";
import { useStorePersist } from "@/src/lib/hooks/use-store";
import { cn } from "@/src/lib/utils/utils";
import DocumentViewer, {
	useDocumentDimensions,
} from "./_components/DocumentViewer";
import {
	type FieldPlacementConfirmPayload,
	FieldPlacementDialog,
	type FieldPlacementSignerOption,
} from "./_components/FieldPlacementDialog";
import Header from "./_components/Header";
import MobileSignatureToolbar from "./_components/MobileSignatureToolbar";
import SignatureFieldsSidebar from "./_components/SignatureFieldsSidebar";
import { useSignatureFields } from "./_components/use-signature-fields";
import {
	type Document,
	fieldTypeConfigs,
	mockDocuments,
	signatureFieldBoxCssPx,
} from "./mock";
import {
	buildPlacementManifestForDocument,
	buildSignersAndViewersForDocument,
	loadDocumentFileBytes,
	type RecipientWithEncryptionProfile,
	SendEnvelopeError,
} from "./send-envelope";

export default function AddSignaturePage() {
	const navigate = useNavigate();
	const { createForm, clearCreateForm } = useStorePersist();
	const sendFile = useSendFile();
	const attachIncentive = useAttachIncentiveToFile();

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

	const {
		width: docWidth,
		height: docHeight,
		isMobile,
	} = useDocumentDimensions();
	const fieldBoxCss = signatureFieldBoxCssPx(isMobile);
	const [currentDocumentId, setCurrentDocumentId] = useState<string>("");
	const [currentPage, setCurrentPage] = useState(1);
	const [zoom, setZoom] = useState(100);
	const [sendStatus, setSendStatus] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");
	const isSendingRef = useRef(false);
	const {
		signatureFields,
		selectedField,
		isPlacingField,
		pendingFieldType,
		setSelectedField,
		handleAddField,
		handleFieldPlaced: placeField,
		handleFieldRemove,
		handleFieldUpdate,
		cancelPlacement,
	} = useSignatureFields();

	const placementCommittedRef = useRef(false);
	const [placementDialogOpen, setPlacementDialogOpen] = useState(false);
	const [placementCoords, setPlacementCoords] = useState<{
		x: number;
		y: number;
		page: number;
	} | null>(null);

	const signerOptionsForPlacement =
		useMemo((): FieldPlacementSignerOption[] => {
			if (!createForm?.recipients?.length) return [];
			return createForm.recipients
				.filter((r) => r.role === "signer")
				.map((r) => {
					const addr = getAddress(r.walletAddress as Address);
					const name = r.name?.trim() || "Signer";
					const email = r.email?.trim() || "";
					const label = email ? `${name} · ${email}` : name;
					return {
						walletAddress: addr,
						name,
						email,
						label,
					};
				});
		}, [createForm?.recipients]);

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

	const handleFieldPlacementRequest = useCallback(
		(coords: { x: number; y: number; page: number }) => {
			if (!pendingFieldType || !currentDocumentId) return;
			if (signerOptionsForPlacement.length === 0) {
				toast.error("Add at least one signer before placing fields.");
				cancelPlacement();
				return;
			}
			setPlacementCoords(coords);
			setPlacementDialogOpen(true);
		},
		[
			pendingFieldType,
			currentDocumentId,
			signerOptionsForPlacement.length,
			cancelPlacement,
		],
	);

	const handlePlacementDialogOpenChange = useCallback(
		(open: boolean) => {
			setPlacementDialogOpen(open);
			if (!open) {
				setPlacementCoords(null);
				if (!placementCommittedRef.current) {
					cancelPlacement();
				}
				placementCommittedRef.current = false;
			}
		},
		[cancelPlacement],
	);

	const handlePlacementConfirm = useCallback(
		(payload: FieldPlacementConfirmPayload) => {
			if (!placementCoords || !pendingFieldType || !currentDocumentId) return;
			placementCommittedRef.current = true;
			const fieldConfig = fieldTypeConfigs.find(
				(config) => config.type === pendingFieldType,
			);
			if (!fieldConfig) return;
			placeField(
				placementCoords.x,
				placementCoords.y,
				placementCoords.page,
				currentDocumentId,
				{
					label: fieldConfig.label,
					assignedSignerWallet: payload.assignedSignerWallet,
					assignedSignerName: payload.assignedSignerName,
					assignedSignerEmail: payload.assignedSignerEmail,
					required: payload.required,
				},
			);
		},
		[placementCoords, pendingFieldType, currentDocumentId, placeField],
	);

	const placementFieldTypeLabel = useMemo(() => {
		if (!pendingFieldType) return "Field";
		return (
			fieldTypeConfigs.find((c) => c.type === pendingFieldType)?.label ??
			pendingFieldType
		);
	}, [pendingFieldType]);

	const handleFieldSelect = (fieldId: string) => setSelectedField(fieldId);

	const handleBack = () => {
		navigate({ to: "/dashboard/envelope/create" });
	};

	const handleSend = async () => {
		if (isSendingRef.current) {
			toast.info("Already sending documents...");
			return;
		}

		if (!createForm?.documents.length) {
			toast.error("No documents to send");
			setSendStatus("error");
			setTimeout(() => setSendStatus("idle"), 3000);
			return;
		}

		if (createForm.documents.length !== 1) {
			toast.error("Only one document per envelope is supported");
			setSendStatus("error");
			setTimeout(() => setSendStatus("idle"), 3000);
			return;
		}

		if (!createForm.recipients || createForm.recipients.length === 0) {
			toast.error("No recipients selected");
			setSendStatus("error");
			setTimeout(() => setSendStatus("idle"), 3000);
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
			setSendStatus("error");
			setTimeout(() => setSendStatus("idle"), 3000);
			return;
		}

		isSendingRef.current = true;
		setSendStatus("loading");
		toast.loading("Sending documents...", { id: "send-progress" });

		try {
			const doc = createForm.documents[0];
			if (!doc) {
				throw new Error("No document to send");
			}
			const fileData = await loadDocumentFileBytes(doc);

			const { signers, viewers } = buildSignersAndViewersForDocument({
				recipients: createForm.recipients,
				recipientMap: recipientProfilesMapWithRecipient as Map<
					Address,
					RecipientWithEncryptionProfile
				>,
			});

			if (signers.length === 0) {
				toast.error("At least one signer is required");
				throw new Error(SendEnvelopeError.NO_SIGNERS);
			}

			const placementManifest = buildPlacementManifestForDocument({
				docId: doc.id,
				signersOrder: signers.map((s) => s.address),
				signatureFields,
				docWidth,
				docHeight,
				fieldBox: fieldBoxCss,
			});

			const result = await sendFile.mutateAsync({
				signers,
				viewers,
				bytes: fileData,
				metadata: { name: doc.name },
				placementManifest,
			});

			if (result.success && result.pieceCid) {
				for (const recipient of createForm.recipients) {
					if (recipient.incentive?.token && recipient.incentive?.amount) {
						const tokenAddress = recipient.incentive.token.toLowerCase();
						const tokenData = SUPPORTED_TOKENS.find(
							(t) => t.address.toLowerCase() === tokenAddress,
						);
						const decimals = tokenData?.decimals ?? 18;
						const amountInWei = parseUnits(
							recipient.incentive.amount,
							decimals,
						);

						await attachIncentive.mutateAsync({
							pieceCid: result.pieceCid,
							signer: recipient.walletAddress as Address,
							token: recipient.incentive.token as Address,
							amount: amountInWei,
						});
					}
				}
			}

			clearCreateForm();

			setSendStatus("success");
			toast.success("Documents sent successfully!", {
				id: "send-progress",
			});

			setTimeout(() => {
				navigate({ to: "/dashboard" });
			}, 1500);
		} catch (error) {
			setSendStatus("error");
			if (
				error instanceof Error &&
				error.message === SendEnvelopeError.MISSING_DATA_URL
			) {
				toast.dismiss("send-progress");
				toast.error("Document is missing file data");
				setTimeout(() => setSendStatus("idle"), 3000);
				return;
			}
			if (
				error instanceof Error &&
				error.message === SendEnvelopeError.NO_SIGNERS
			) {
				toast.dismiss("send-progress");
				setTimeout(() => setSendStatus("idle"), 3000);
				return;
			}
			console.error("Failed to send documents:", error);
			toast.error("Failed to send documents. Please try again.", {
				id: "send-progress",
			});
			setTimeout(() => setSendStatus("idle"), 3000);
		} finally {
			isSendingRef.current = false;
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
			<Header onSend={handleSend} status={sendStatus} />

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
							documentPage={currentPage}
							onFieldPlacementRequest={handleFieldPlacementRequest}
							onPdfPageChange={setCurrentPage}
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

			<FieldPlacementDialog
				open={placementDialogOpen}
				onOpenChange={handlePlacementDialogOpenChange}
				fieldTypeLabel={placementFieldTypeLabel}
				signers={signerOptionsForPlacement}
				onConfirm={handlePlacementConfirm}
			/>
		</div>
	);
}
