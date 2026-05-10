import { useFilosignContext } from "@filosign/react";
import {
	useAckFile,
	useComplianceBundle,
	useDocumentIncentive,
	useFileInfo,
	useSignDraft,
	useSignFile,
	useUpdateSignDraft,
	useViewFile,
	type ViewFileResult,
} from "@filosign/react/hooks";
import { zPlacementManifest } from "@filosign/shared";
import {
	ArrowLeftIcon,
	ArrowSquareOutIcon,
	CaretLeftIcon,
	CaretRightIcon,
	CheckCircleIcon,
	CheckIcon,
	ClockIcon,
	DownloadIcon,
	FileArrowDownIcon,
	FileTextIcon,
	MagnifyingGlassMinusIcon,
	MagnifyingGlassPlusIcon,
	ScrollIcon,
	SpinnerIcon,
	UserIcon,
} from "@phosphor-icons/react";
import { usePrivy } from "@privy-io/react-auth";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { formatUnits, getAddress } from "viem";
import {
	defaultChain,
	erc20DisplayForChain,
	SUPPORTED_TOKENS,
} from "@/src/constants";
import { CopyButton } from "@/src/lib/components/custom/CopyButton";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { cn } from "@/src/lib/utils";
import {
	buildCompliancePdfOnly,
	buildDocumentPlusCompliancePdf,
	downloadPdfBytes,
	fetchSignerIncentivesForCompliancePdf,
	sha256HexOfBytes,
} from "@/src/lib/utils/compliance-pdf";

const LazyPdfJsPreview = lazy(
	() => import("@/src/lib/components/custom/PdfJsPreview.lazy"),
);

const DEBUG_PREFIX = "[SignFlow]";
const debugLog = (step: string, data?: unknown) => {
	console.log(
		`${DEBUG_PREFIX} ${step}`,
		data ? JSON.stringify(data, null, 2) : "",
	);
};

export default function SignDocumentPage() {
	const navigate = useNavigate();
	const search = useSearch({ from: "/dashboard/document/sign/" });
	const pieceCid = search.pieceCid;

	const { user } = usePrivy();
	const { contracts } = useFilosignContext();
	const signerAddress = user?.wallet?.address as `0x${string}` | undefined;

	debugLog("COMPONENT_MOUNT", {
		pieceCid,
		signerAddress,
		timestamp: Date.now(),
	});

	const {
		data: file,
		isLoading: fileLoading,
		error: fileError,
	} = useFileInfo({ pieceCid });

	useEffect(() => {
		debugLog("FILE_INFO_UPDATED", {
			pieceCid,
			hasFile: !!file,
			isLoading: fileLoading,
			hasError: !!fileError,
			fileStatus: file?.status,
			signerCount: file?.signers?.length,
			signatureCount: file?.signatures?.length,
		});
	}, [file, fileLoading, fileError, pieceCid]);

	const acknowledgeFile = useAckFile();

	const { data: incentive } = useDocumentIncentive({
		pieceCid,
		signerAddress,
	});

	const tokenInfo = useMemo(() => {
		if (!incentive?.token) return null;
		return (
			SUPPORTED_TOKENS.find(
				(t) => t.address.toLowerCase() === incentive.token.toLowerCase(),
			) || null
		);
	}, [incentive]);

	const mySignature = useMemo(() => {
		if (!signerAddress || !file?.signatures?.length) return undefined;
		return file.signatures.find(
			(s) => s.signer.toLowerCase() === signerAddress.toLowerCase(),
		);
	}, [file, signerAddress]);

	const alreadySigned = Boolean(mySignature);

	const signedTxExplorerUrl = useMemo(() => {
		if (!mySignature?.onchainTxHash) return null;
		const base = defaultChain.blockExplorers?.default?.url;
		if (!base) return null;
		return `${base}/tx/${mySignature.onchainTxHash}` as const;
	}, [mySignature]);

	const explorerLabel =
		defaultChain.blockExplorers?.default?.name ?? "Block explorer";

	const isSender = Boolean(
		signerAddress &&
			file?.sender &&
			signerAddress.toLowerCase() === file.sender.toLowerCase(),
	);

	const canSign = Boolean(signerAddress && file && !alreadySigned && !isSender);

	const viewFile = useViewFile();
	const complianceBundle = useComplianceBundle();
	const signFile = useSignFile();

	const signDraftPieceCid =
		pieceCid && file?.kemCiphertext && file?.encryptedEncryptionKey
			? pieceCid
			: undefined;
	const { data: serverDraftIds } = useSignDraft(signDraftPieceCid);
	const updateSignDraft = useUpdateSignDraft();

	const [completedFieldIds, setCompletedFieldIds] = useState<string[]>([]);
	const hasHydratedDraftForPieceCid = useRef<string | null>(null);
	const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	useEffect(() => {
		hasHydratedDraftForPieceCid.current = null;
		setCompletedFieldIds([]);
	}, [pieceCid]);

	useEffect(() => {
		if (!pieceCid || serverDraftIds === undefined) {
			debugLog("DRAFT_HYDRATION_SKIPPED", {
				pieceCid,
				hasServerDraftIds: serverDraftIds !== undefined,
			});
			return;
		}
		if (hasHydratedDraftForPieceCid.current === pieceCid) {
			debugLog("DRAFT_HYDRATION_ALREADY_DONE", { pieceCid });
			return;
		}
		debugLog("DRAFT_HYDRATION_START", {
			pieceCid,
			serverDraftIds,
			currentCompleted: completedFieldIds,
		});
		hasHydratedDraftForPieceCid.current = pieceCid;
		setCompletedFieldIds((prev) => {
			const next = prev.length > 0 ? prev : [...serverDraftIds];
			debugLog("DRAFT_HYDRATION_COMPLETE", {
				pieceCid,
				previousCount: prev.length,
				newCount: next.length,
				hydratedIds: serverDraftIds,
			});
			return next;
		});
	}, [pieceCid, serverDraftIds]);

	useEffect(() => {
		return () => {
			if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
		};
	}, []);

	const flushSignDraft = useCallback(
		(ids: string[]) => {
			if (!pieceCid) {
				debugLog("FLUSH_SIGN_DRAFT_BLOCKED", { reason: "no pieceCid" });
				return;
			}
			debugLog("FLUSH_SIGN_DRAFT", {
				pieceCid,
				completedFieldIds: ids,
				count: ids.length,
			});
			void updateSignDraft
				.mutateAsync({ pieceCid, completedFieldIds: ids })
				.then(() => {
					debugLog("SIGN_DRAFT_SAVED", { pieceCid, completedFieldIds: ids });
				})
				.catch((err: unknown) => {
					debugLog("SIGN_DRAFT_SAVE_FAILED", {
						pieceCid,
						error: err instanceof Error ? err.message : String(err),
					});
					console.warn("[sign-draft] save failed", err);
				});
		},
		[pieceCid, updateSignDraft],
	);

	const scheduleSignDraftSave = useCallback(
		(ids: string[]) => {
			if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
			draftSaveTimerRef.current = setTimeout(() => {
				flushSignDraft(ids);
			}, 500);
		},
		[flushSignDraft],
	);

	/** Draft ids are cleared after submit; use on-chain signature as source of truth. */
	const isMyPlacementFieldDone = useCallback(
		(fieldId: string) => alreadySigned || completedFieldIds.includes(fieldId),
		[alreadySigned, completedFieldIds],
	);

	const togglePlacementField = useCallback(
		(fieldId: string) => {
			if (alreadySigned) return;
			debugLog("TOGGLE_PLACEMENT_FIELD", {
				fieldId,
				currentCompleted: completedFieldIds,
			});
			setCompletedFieldIds((prev) => {
				const isRemoving = prev.includes(fieldId);
				const next = isRemoving
					? prev.filter((x) => x !== fieldId)
					: [...prev, fieldId];
				debugLog("COMPLETED_FIELDS_UPDATED", {
					fieldId,
					action: isRemoving ? "removed" : "added",
					previousCount: prev.length,
					newCount: next.length,
					newCompletedIds: next,
				});
				scheduleSignDraftSave(next);
				return next;
			});
		},
		[scheduleSignDraftSave, completedFieldIds, alreadySigned],
	);

	const [zoom, setZoom] = useState(100);
	const [signPdfPage, setSignPdfPage] = useState(1);
	const [signPdfNumPages, setSignPdfNumPages] = useState<number | null>(null);
	const [viewError, setViewError] = useState<string | null>(null);
	const [fileData, setFileData] = useState<ViewFileResult | null>(null);
	const [pdfExportBusy, setPdfExportBusy] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const documentRef = useRef<HTMLDivElement>(null);

	const myPlacementFields = useMemo(() => {
		debugLog("COMPUTING_MY_PLACEMENT_FIELDS", {
			hasSignerAddress: !!signerAddress,
			hasPlacementManifest: !!fileData?.placementManifest,
		});
		if (!signerAddress || !fileData?.placementManifest) return [];
		const parsed = zPlacementManifest.safeParse(fileData.placementManifest);
		if (!parsed.success) {
			debugLog("PLACEMENT_MANIFEST_PARSE_FAILED", { error: parsed.error });
			return [];
		}
		const me = getAddress(signerAddress);
		const fields = parsed.data.fields.filter(
			(f) => getAddress(f.assignedSigner) === me,
		);
		debugLog("MY_PLACEMENT_FIELDS_COMPUTED", {
			fieldCount: fields.length,
			fieldIds: fields.map((f) => f.id),
			pageIndices: fields.map((f) => f.pageIndex),
		});
		return fields;
	}, [fileData?.placementManifest, signerAddress]);

	/** Hint for page count from placement manifest until pdf.js reports the real total. */
	const signPdfPageCountHint = useMemo(() => {
		if (myPlacementFields.length === 0) return null;
		return Math.max(...myPlacementFields.map((f) => f.pageIndex)) + 1;
	}, [myPlacementFields]);

	const requiredPlacementIds = useMemo(
		() => myPlacementFields.filter((f) => f.required).map((f) => f.id),
		[myPlacementFields],
	);

	const canSubmitPlacementSign = useMemo(() => {
		if (!canSign || myPlacementFields.length === 0) return false;
		const requiredOk =
			requiredPlacementIds.length === 0 ||
			requiredPlacementIds.every((id) => completedFieldIds.includes(id));
		const hasLeaf = completedFieldIds.length > 0;
		return requiredOk && hasLeaf;
	}, [
		canSign,
		myPlacementFields.length,
		requiredPlacementIds,
		completedFieldIds,
	]);

	/** Stable binary source for pdf.js (avoid re-parsing on unrelated re-renders). */
	const previewPdfBytes = useMemo(() => {
		if (!fileData) return null;
		const mime = fileData.metadata.mimeType;
		const name = fileData.metadata.name?.toLowerCase() ?? "";
		const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
		debugLog("PREVIEW_PDF_BYTES_COMPUTED", {
			hasFileData: !!fileData,
			mimeType: mime,
			fileName: name,
			isPdf,
			byteLength: fileData.fileBytes?.length,
		});
		if (!isPdf) return null;
		return new Uint8Array(fileData.fileBytes);
	}, [fileData]);

	const isSigningPdf = Boolean(previewPdfBytes);
	const signPdfTotalDisplay = signPdfNumPages ?? signPdfPageCountHint;

	useEffect(() => {
		debugLog("PDF_PAGE_RESET", {
			pieceCid,
			hasPreviewBytes: !!previewPdfBytes,
		});
		setSignPdfPage(1);
		setSignPdfNumPages(null);
	}, [pieceCid, previewPdfBytes]);

	// Memoize the handleViewFile function
	const handleViewFile = useCallback(async () => {
		debugLog("HANDLE_VIEW_FILE_START", {
			pieceCid: file?.pieceCid,
			hasKemCiphertext: !!file?.kemCiphertext,
			hasEncryptedKey: !!file?.encryptedEncryptionKey,
		});
		if (!file?.kemCiphertext || !file?.encryptedEncryptionKey) {
			const errMsg = "Missing decryption keys. Acknowledge the file first.";
			debugLog("VIEW_FILE_BLOCKED", { reason: errMsg });
			setViewError(errMsg);
			return;
		}

		try {
			setViewError(null);
			debugLog("VIEW_FILE_MUTATING", {
				pieceCid: file.pieceCid,
				status: file.status,
			});
			const result = await viewFile.mutateAsync({
				pieceCid: file.pieceCid,
				kemCiphertext: file.kemCiphertext,
				encryptedEncryptionKey: file.encryptedEncryptionKey,
				status: file.status as "s3" | "foc",
			});
			debugLog("VIEW_FILE_SUCCESS", {
				pieceCid: file.pieceCid,
				fileBytesLength: result.fileBytes?.length,
				sender: result.sender,
				metadata: result.metadata,
				hasPlacementManifest: !!result.placementManifest,
			});
			setFileData(result);
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Failed to load file for signing";
			debugLog("VIEW_FILE_ERROR", {
				error: errorMessage,
				stack: error instanceof Error ? error.stack : undefined,
			});
			console.error("Failed to load file:", error);
			setViewError(errorMessage);
			toast.error(errorMessage);
		}
	}, [file, viewFile]);

	// Load file data when component mounts or file changes
	useEffect(() => {
		if (
			file?.kemCiphertext &&
			file.encryptedEncryptionKey &&
			!fileData &&
			!viewFile.isPending
		) {
			handleViewFile();
		}
	}, [file, fileData, viewFile.isPending, handleViewFile]);

	const handleZoomIn = useCallback(() => {
		setZoom((prev) => Math.min(prev + 25, 200));
	}, []);

	const handleZoomOut = useCallback(() => {
		setZoom((prev) => Math.max(prev - 25, 50));
	}, []);

	const handleDownload = useCallback(() => {
		if (fileData) {
			const arrayBuffer = new ArrayBuffer(fileData.fileBytes.length);
			new Uint8Array(arrayBuffer).set(fileData.fileBytes);
			const blob = new Blob([arrayBuffer], {
				type: fileData.metadata.mimeType,
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = fileData.metadata.name || `document-${pieceCid.slice(0, 8)}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toast.success("File downloaded!");
		}
	}, [fileData, pieceCid]);

	const handleDownloadCompliancePdf = useCallback(async () => {
		if (!file || !pieceCid) return;
		setPdfExportBusy(true);
		try {
			const documentSha256 = fileData
				? await sha256HexOfBytes(fileData.fileBytes)
				: undefined;
			const { bundle, bundleHash, exportId } =
				await complianceBundle.mutateAsync({
					pieceCid,
					documentSha256,
				});
			const explorerBase = defaultChain.blockExplorers?.default?.url ?? null;
			const signerIncentives = contracts?.FSFileRegistry?.read
				? await fetchSignerIncentivesForCompliancePdf(
						contracts.FSFileRegistry.read,
						pieceCid,
						file.signers,
						erc20DisplayForChain,
					)
				: undefined;
			const bytes = await buildCompliancePdfOnly({
				bundle,
				bundleHash,
				exportId,
				chainName: defaultChain.name,
				explorerBaseUrl: explorerBase,
				signerIncentives,
				documentSha256,
				decryptedDocumentMeta: fileData
					? {
							name: fileData.metadata.name,
							mimeType: fileData.metadata.mimeType,
							sizeBytes: fileData.fileBytes.length,
						}
					: null,
			});
			const safe = pieceCid.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
			downloadPdfBytes(bytes, `filosign-file-record-${safe}`);
			toast.success("Compliance PDF downloaded");
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : "Could not create compliance PDF",
			);
		} finally {
			setPdfExportBusy(false);
		}
	}, [
		complianceBundle,
		contracts?.FSFileRegistry?.read,
		file,
		fileData,
		pieceCid,
	]);

	const handleDownloadDocumentWithCompliancePdf = useCallback(async () => {
		if (!file || !pieceCid || !fileData) {
			toast.error("Load the document first to bundle with the compliance PDF.");
			return;
		}
		setPdfExportBusy(true);
		try {
			const documentSha256 = await sha256HexOfBytes(fileData.fileBytes);
			const { bundle, bundleHash, exportId } =
				await complianceBundle.mutateAsync({
					pieceCid,
					documentSha256,
				});
			const explorerBase = defaultChain.blockExplorers?.default?.url ?? null;
			const signerIncentives = contracts?.FSFileRegistry?.read
				? await fetchSignerIncentivesForCompliancePdf(
						contracts.FSFileRegistry.read,
						pieceCid,
						file.signers,
						erc20DisplayForChain,
					)
				: undefined;
			const bytes = await buildDocumentPlusCompliancePdf({
				bundle,
				bundleHash,
				exportId,
				fileData,
				chainName: defaultChain.name,
				explorerBaseUrl: explorerBase,
				signerIncentives,
				documentSha256,
			});
			const safe = pieceCid.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
			downloadPdfBytes(bytes, `filosign-document-with-record-${safe}`);
			toast.success("PDF with document and compliance appendix downloaded");
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : "Could not create bundled PDF",
			);
		} finally {
			setPdfExportBusy(false);
		}
	}, [
		complianceBundle,
		contracts?.FSFileRegistry?.read,
		file,
		fileData,
		pieceCid,
	]);

	const formatAddress = (address: string) => {
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	};

	const handleAcknowledge = async () => {
		if (!pieceCid) return;

		try {
			await acknowledgeFile.mutateAsync({ pieceCid });
			toast.success("File acknowledged!");
		} catch (error) {
			console.error(error);
			toast.error("Failed to acknowledge file");
		}
	};

	const handleSign = async () => {
		debugLog("HANDLE_SIGN_START", {
			pieceCid,
			canSubmitPlacementSign,
			completedFieldIds,
			completedCount: completedFieldIds.length,
			signerAddress,
		});
		if (!pieceCid) {
			debugLog("SIGN_BLOCKED_NO_PIECE_CID");
			return;
		}
		if (!canSubmitPlacementSign) {
			const errMsg = "Mark every required field on the document first.";
			debugLog("SIGN_BLOCKED_VALIDATION_FAILED", {
				reason: errMsg,
				requiredPlacementIds,
				completedFieldIds,
			});
			toast.error(errMsg);
			return;
		}
		try {
			debugLog("SIGN_FILE_MUTATING", { pieceCid, completedFieldIds });
			await signFile.mutateAsync({
				pieceCid,
				completedFieldIds,
			});
			debugLog("SIGN_FILE_SUCCESS", { pieceCid });
			toast.success("Document signed successfully!");
			window.location.reload();
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to sign";
			debugLog("SIGN_FILE_ERROR", {
				error: errorMessage,
				stack: error instanceof Error ? error.stack : undefined,
			});
			console.error(error);
			toast.error(errorMessage);
		}
	};

	const renderFileContent = () => {
		// Show error if decryption failed
		if (viewError) {
			return (
				<div className="flex items-center justify-center w-full h-full text-sm text-muted-foreground p-4 text-center">
					<div className="flex flex-col items-center gap-3 md:gap-4">
						<FileTextIcon className="size-12 md:size-16 text-destructive/50" />
						<div className="text-xs md:text-sm text-destructive font-medium">
							Failed to decrypt file
						</div>
						<div className="text-xs text-muted-foreground max-w-md">
							{viewError}
						</div>
						<Button
							size="sm"
							variant="outline"
							onClick={handleViewFile}
							disabled={viewFile.isPending}
						>
							Retry
						</Button>
					</div>
				</div>
			);
		}

		// Check if we have the decrypted file data
		if (!fileData) {
			return (
				<div className="flex items-center justify-center w-full h-full text-sm text-muted-foreground p-4 text-center">
					<div className="flex flex-col items-center gap-3 md:gap-4">
						<FileTextIcon className="size-12 md:size-16 text-muted-foreground/50" />
						<div className="text-xs md:text-sm">No file preview available</div>
					</div>
				</div>
			);
		}

		const { fileBytes, metadata } = fileData;
		const mimeType = metadata.mimeType;
		const fileName = metadata.name;

		// Handle image files
		if (
			mimeType?.startsWith("image/") ||
			fileName?.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)
		) {
			const arrayBuffer = new ArrayBuffer(fileBytes.length);
			new Uint8Array(arrayBuffer).set(fileBytes);
			const blob = new Blob([arrayBuffer], { type: mimeType });
			const imageUrl = URL.createObjectURL(blob);

			return (
				<div className="flex flex-col items-center justify-center w-full h-full gap-4 p-4 md:p-8 bg-muted/5">
					<div
						className="relative bg-white border shadow-lg border-border"
						style={{
							width: 600,
							height: 800,
							transform: `scale(${zoom / 100})`,
							transformOrigin: "center",
						}}
					>
						<img
							src={imageUrl}
							alt={fileName || "Document"}
							className="absolute inset-0 w-full h-full object-contain"
							onLoad={() => URL.revokeObjectURL(imageUrl)}
						/>
						{myPlacementFields
							.filter((f) => f.pageIndex === 0)
							.map((field) => {
								const done = isMyPlacementFieldDone(field.id);
								return (
									<button
										key={field.id}
										type="button"
										disabled={alreadySigned}
										className={cn(
											"absolute z-10 flex items-center justify-center rounded border-2 px-0.5 text-[9px] font-semibold uppercase tracking-tight transition-colors",
											done
												? "border-emerald-600 bg-emerald-500/25 text-emerald-950"
												: "border-amber-500 bg-amber-400/20 text-amber-950 hover:bg-amber-400/35",
										)}
										style={{
											left: `${field.rect.x * 100}%`,
											top: `${field.rect.y * 100}%`,
											width: `${Math.max(field.rect.width * 100, 8)}%`,
											height: `${Math.max(field.rect.height * 100, 5)}%`,
										}}
										onClick={() => togglePlacementField(field.id)}
									>
										{alreadySigned
											? "Signed"
											: done
												? "Done"
												: field.required
													? "Req"
													: "Opt"}
									</button>
								);
							})}
					</div>
					{myPlacementFields.some((f) => f.pageIndex !== 0) && (
						<div className="w-full max-w-[600px] rounded-lg border border-border bg-background/80 p-3">
							<p className="mb-2 text-xs font-medium text-muted-foreground">
								Fields on other pages — tap to mark complete
							</p>
							<div className="flex flex-wrap gap-2">
								{myPlacementFields
									.filter((f) => f.pageIndex !== 0)
									.map((field) => {
										const done = isMyPlacementFieldDone(field.id);
										return (
											<Button
												key={field.id}
												type="button"
												size="sm"
												variant={done ? "secondary" : "outline"}
												className="h-8 text-xs"
												disabled={alreadySigned}
												onClick={() => togglePlacementField(field.id)}
											>
												P{field.pageIndex + 1} ·{" "}
												{field.required ? "Required" : "Optional"}
												{alreadySigned ? " · signed" : done ? " ✓" : ""}
											</Button>
										);
									})}
							</div>
						</div>
					)}
				</div>
			);
		}

		// Handle PDF files
		if (
			mimeType === "application/pdf" ||
			fileName?.toLowerCase().endsWith(".pdf")
		) {
			if (!previewPdfBytes) {
				return (
					<div className="flex items-center justify-center w-full h-full p-4 text-sm text-muted-foreground">
						Loading PDF…
					</div>
				);
			}

			return (
				<div className="flex flex-col items-center justify-center w-full h-full gap-4 p-4 md:p-8 bg-muted/5">
					<div
						className="relative bg-white border shadow-lg border-border"
						style={{
							width: 600,
							height: 800,
							transform: `scale(${zoom / 100})`,
							transformOrigin: "center",
						}}
					>
						<div className="absolute inset-0 overflow-hidden bg-white">
							<Suspense
								fallback={
									<div className="flex min-h-[240px] items-center justify-center bg-white">
										<InlineLoader size="md" />
									</div>
								}
							>
								<LazyPdfJsPreview
									className="absolute inset-0 z-0"
									documentKey={pieceCid ?? "sign"}
									file={previewPdfBytes}
									pageNumber={signPdfPage}
									width={600}
									maxHeight={800}
									onNumPagesLoaded={(n) => {
										setSignPdfNumPages(n);
										setSignPdfPage((p) => Math.min(p, n));
									}}
									renderPageOverlay={(pageIndex) => (
										<>
											{myPlacementFields
												.filter((f) => f.pageIndex === pageIndex)
												.map((field) => {
													const done = isMyPlacementFieldDone(field.id);
													return (
														<button
															key={field.id}
															type="button"
															disabled={alreadySigned}
															className={cn(
																"pointer-events-auto absolute z-10 flex items-center justify-center rounded border-2 px-0.5 text-[9px] font-semibold uppercase tracking-tight transition-colors",
																done
																	? "border-emerald-600 bg-emerald-500/25 text-emerald-950"
																	: "border-amber-500 bg-amber-400/20 text-amber-950 hover:bg-amber-400/35",
															)}
															style={{
																left: `${field.rect.x * 100}%`,
																top: `${field.rect.y * 100}%`,
																width: `${Math.max(field.rect.width * 100, 8)}%`,
																height: `${Math.max(field.rect.height * 100, 5)}%`,
															}}
															onClick={() => togglePlacementField(field.id)}
														>
															{alreadySigned
																? "Signed"
																: done
																	? "Selected"
																	: field.required
																		? "Required"
																		: "Optional"}
														</button>
													);
												})}
										</>
									)}
								/>
							</Suspense>
						</div>
					</div>
				</div>
			);
		}

		// Handle text files
		if (
			mimeType?.startsWith("text/") ||
			fileName?.toLowerCase().match(/\.(txt|md|json|xml|html|css|js|ts)$/)
		) {
			try {
				const textContent = new TextDecoder().decode(fileBytes);
				return (
					<div className="w-full h-full p-4 md:p-8 overflow-auto">
						<pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
							{textContent}
						</pre>
					</div>
				);
			} catch (error) {
				console.error("Error decoding text file:", error);
				return (
					<div className="flex items-center justify-center w-full h-full text-sm text-muted-foreground p-4 text-center">
						<div className="flex flex-col items-center gap-3 md:gap-4">
							<FileTextIcon className="size-12 md:size-16 text-muted-foreground/50" />
							<div className="text-xs md:text-sm">Cannot display text file</div>
						</div>
					</div>
				);
			}
		}

		// Fallback for other file types
		return (
			<div className="flex flex-col items-center justify-center w-full h-full gap-4 p-4 text-sm text-muted-foreground">
				<div className="flex flex-col items-center gap-3 text-center">
					<FileTextIcon className="size-12 md:size-16 text-muted-foreground/50" />
					<div className="text-xs md:text-sm">
						Preview not available for this file type
					</div>
					<div className="text-xs text-muted-foreground/70">
						{mimeType || fileName}
					</div>
					<Button
						size="sm"
						variant="outline"
						onClick={handleDownload}
						className="mt-2"
					>
						<DownloadIcon className="size-4 mr-2" />
						Download File
					</Button>
				</div>
				{canSign && myPlacementFields.length > 0 && (
					<div className="w-full max-w-md rounded-lg border border-border bg-background/90 p-4 text-left">
						<p className="mb-3 text-xs font-medium text-foreground">
							Mark each field you are signing (required fields must all be
							selected):
						</p>
						<div className="flex flex-col gap-2">
							{myPlacementFields.map((field) => {
								const done = isMyPlacementFieldDone(field.id);
								return (
									<Button
										key={field.id}
										type="button"
										size="sm"
										variant={done ? "secondary" : "outline"}
										className="h-auto justify-start py-2 text-left text-xs"
										disabled={alreadySigned}
										onClick={() => togglePlacementField(field.id)}
									>
										p.{field.pageIndex + 1} · {field.type}
										{field.required ? " · required" : ""}
										{alreadySigned ? " · signed" : done ? " ✓" : ""}
									</Button>
								);
							})}
						</div>
					</div>
				)}
			</div>
		);
	};

	// Show loader while authenticating or loading file
	if (fileLoading) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4">
				<InlineLoader size="lg" />
				<p className="text-sm text-muted-foreground">Preparing document…</p>
			</div>
		);
	}

	if (fileError || !file) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
				<FileTextIcon className="h-16 w-16 text-muted-foreground mb-4" />
				<h2 className="text-xl font-semibold mb-2">File Not Found</h2>
				<p className="text-muted-foreground mb-4">
					The document you're trying to sign could not be found.
				</p>
				{fileError && (
					<p className="text-xs text-destructive mb-4 max-w-md text-center">
						Error:{" "}
						{fileError instanceof Error ? fileError.message : "Unknown error"}
					</p>
				)}
				<Button onClick={() => navigate({ to: "/dashboard" })}>
					<ArrowLeftIcon className="h-4 w-4 mr-2" />
					Back to Dashboard
				</Button>
			</div>
		);
	}

	// Server returns kemCiphertext/encryptedEncryptionKey only when user can read (acked or sender)
	if (!file.kemCiphertext || !file.encryptedEncryptionKey) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
				<FileTextIcon className="h-16 w-16 text-amber-500 mb-4" />
				<h2 className="text-xl font-semibold mb-2">Accept File?</h2>
				<p className="text-muted-foreground mb-4 text-center max-w-md">
					This document must be acknowledged before it can be viewed or signed.
				</p>
				<div className="flex items-center gap-3">
					<Button
						onClick={handleAcknowledge}
						disabled={acknowledgeFile.isPending}
						variant="primary"
					>
						{acknowledgeFile.isPending ? (
							<>
								<SpinnerIcon className="size-5 animate-spin" />
								Accepting
							</>
						) : (
							<>
								<CheckCircleIcon className="size-5" />
								Accept File
							</>
						)}
					</Button>
				</div>
			</div>
		);
	}

	// Check if pieceCid is provided
	if (!pieceCid) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen p-8">
				<FileTextIcon className="h-16 w-16 text-muted-foreground mb-4" />
				<h2 className="text-xl font-semibold mb-2">Invalid Request</h2>
				<p className="text-muted-foreground mb-4">
					No document specified for signing.
				</p>
				<Button onClick={() => navigate({ to: "/dashboard" })}>
					<ArrowLeftIcon className="h-4 w-4 mr-2" />
					Back to Dashboard
				</Button>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 bg-background flex flex-col">
			<div className="shrink-0 sticky top-0 z-50 bg-background border-b border-border">
				<div className="md:hidden">
					<div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => navigate({ to: "/dashboard" })}
							className="text-muted-foreground hover:text-foreground hover:bg-accent/50 -ml-2"
						>
							<ArrowLeftIcon className="size-4 mr-1.5" />
							<span className="text-sm">Back</span>
						</Button>
						<h2 className="text-sm flex items-center font-semibold truncate text-foreground max-w-[60%]">
							<span className="truncate">{pieceCid}</span>
							<CopyButton text={pieceCid} />
						</h2>
					</div>

					{alreadySigned && (
						<div className="flex flex-wrap items-center justify-center gap-2 px-3 py-2 border-b border-border bg-secondary/40">
							<Badge
								variant="secondary"
								className="gap-1.5 border-border bg-secondary/90 text-secondary-foreground shadow-none"
							>
								<CheckCircleIcon
									className="size-3.5 text-chart-2"
									weight="fill"
								/>
								Signed
							</Badge>
							{signedTxExplorerUrl ? (
								<a
									href={signedTxExplorerUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-xs font-medium text-ring hover:text-ring/90 hover:underline"
								>
									{explorerLabel}
									<ArrowSquareOutIcon className="size-3.5" />
								</a>
							) : (
								<span className="text-xs text-muted-foreground">
									On-chain proof recorded
								</span>
							)}
						</div>
					)}

					{incentive && incentive.amount > 0n && (
						<div className="flex flex-wrap items-center justify-center gap-2 px-3 py-2 border-b border-border bg-accent/30">
							<pre className="font-medium">
								{formatUnits(incentive.amount, tokenInfo?.decimals ?? 18)}
							</pre>
							<pre className="font-medium">{tokenInfo?.symbol ?? "Tokens"}</pre>
							<img
								src={tokenInfo?.icon}
								alt={tokenInfo?.symbol}
								className="size-4"
							/>
							{incentive.claimed && (
								<span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
									(Distributed)
								</span>
							)}
						</div>
					)}

					{/* Row 2: Action buttons */}
					<div className="flex items-center justify-between px-3 py-2">
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="sm"
								onClick={handleZoomOut}
								className="text-muted-foreground hover:text-foreground hover:bg-accent/50 size-8 p-0"
							>
								<MagnifyingGlassMinusIcon className="size-4" />
							</Button>
							<span className="text-xs font-medium min-w-10 text-center text-foreground">
								{zoom}%
							</span>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleZoomIn}
								className="text-muted-foreground hover:text-foreground hover:bg-accent/50 size-8 p-0"
							>
								<MagnifyingGlassPlusIcon className="size-4" />
							</Button>
							{isSigningPdf && (
								<>
									<div className="mx-0.5 h-5 w-px self-center bg-border/70" />
									<Button
										variant="ghost"
										size="sm"
										type="button"
										onClick={() => setSignPdfPage((p) => Math.max(1, p - 1))}
										disabled={signPdfPage <= 1}
										className="text-muted-foreground hover:text-foreground hover:bg-accent/50 size-8 p-0"
										title="Previous page"
									>
										<CaretLeftIcon className="size-4" />
									</Button>
									<span className="min-w-10 text-center text-[10px] font-medium tabular-nums text-muted-foreground">
										{signPdfTotalDisplay == null
											? `${signPdfPage} / …`
											: `${signPdfPage} / ${signPdfTotalDisplay}`}
									</span>
									<Button
										variant="ghost"
										size="sm"
										type="button"
										onClick={() =>
											setSignPdfPage((p) =>
												signPdfTotalDisplay == null
													? p + 1
													: Math.min(signPdfTotalDisplay, p + 1),
											)
										}
										disabled={
											signPdfTotalDisplay != null &&
											signPdfPage >= signPdfTotalDisplay
										}
										className="text-muted-foreground hover:text-foreground hover:bg-accent/50 size-8 p-0"
										title="Next page"
									>
										<CaretRightIcon className="size-4" />
									</Button>
								</>
							)}
						</div>

						<div className="flex items-center gap-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={handleDownloadDocumentWithCompliancePdf}
								disabled={!fileData || pdfExportBusy}
								className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
								title="Download document with proof"
							>
								<DownloadIcon className="size-5" />
							</Button>

							{canSign && signerAddress && (
								<Button
									variant="primary"
									size="sm"
									onClick={() => void handleSign()}
									disabled={signFile.isPending || !canSubmitPlacementSign}
								>
									{signFile.isPending ? (
										<>
											<SpinnerIcon className="size-4 animate-spin" />
											Signing…
										</>
									) : (
										"Sign"
									)}
								</Button>
							)}
						</div>
					</div>
				</div>

				{/* Desktop Header - Single row */}
				<div className="hidden md:flex items-center justify-between w-full px-6 py-3">
					<div className="flex items-center gap-4">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => navigate({ to: "/dashboard" })}
							className="text-muted-foreground hover:text-foreground hover:bg-accent/50"
						>
							<ArrowLeftIcon className="size-4 mr-2" />
							Back
						</Button>
						<div className="flex gap-4">
							<div className="flex flex-col">
								<h2 className="text-sm flex items-center gap-1 font-semibold truncate text-foreground">
									<span className="truncate max-w-xs">{pieceCid}</span>
									<CopyButton text={pieceCid} />
								</h2>
								<p className="text-xs text-muted-foreground flex items-center gap-1">
									From {formatAddress(file.sender)}
									<CopyButton text={formatAddress(file.sender)} />
								</p>
							</div>
							{alreadySigned && (
								<div className="flex flex-wrap items-center gap-2 mt-2">
									<Badge
										variant="secondary"
										className="gap-1.5 border-border bg-secondary/90 text-secondary-foreground shadow-none"
									>
										<CheckCircleIcon
											className="size-3.5 text-chart-2"
											weight="fill"
										/>
										Signed
									</Badge>
									{signedTxExplorerUrl ? (
										<a
											href={signedTxExplorerUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1 text-xs font-medium text-ring hover:text-ring/90 hover:underline"
										>
											{explorerLabel}
											<ArrowSquareOutIcon className="size-3.5" />
										</a>
									) : (
										<span className="text-xs text-muted-foreground">
											On-chain proof recorded
										</span>
									)}
								</div>
							)}
							{incentive && incentive.amount > 0n && (
								<div className="flex flex-wrap items-center gap-2 mt-2">
									<Badge
										variant="default"
										className={cn(
											incentive.claimed ? "bg-accent" : "bg-chart-1",
										)}
									>
										<pre className="font-medium">
											{formatUnits(incentive.amount, tokenInfo?.decimals ?? 18)}
										</pre>
										<pre className="font-medium">
											{tokenInfo?.symbol ?? "Tokens"}
										</pre>
										<img
											src={tokenInfo?.icon}
											alt={tokenInfo?.symbol}
											className="size-4"
										/>
									</Badge>
									<div className="items-center text-xs font-medium text-ring hover:text-ring/90">
										{incentive.claimed ? (
											<span className="inline-flex items-center gap-1">
												Distributed
												<CheckIcon className="size-3.5" />
											</span>
										) : (
											<span className="inline-flex items-center gap-1 text-chart-1">
												Pending
												<ClockIcon className="size-3.5" />
											</span>
										)}
									</div>
								</div>
							)}
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Zoom controls */}
						<div className="flex items-center gap-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={handleZoomOut}
								className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
							>
								<MagnifyingGlassMinusIcon className="size-5" />
							</Button>
							<span className="text-sm font-medium min-w-12 text-center text-foreground tabular-nums">
								{zoom}%
							</span>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleZoomIn}
								className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
							>
								<MagnifyingGlassPlusIcon className="size-5" />
							</Button>
							{isSigningPdf && (
								<>
									<div className="mx-1 h-6 w-px bg-border" />
									<Button
										variant="ghost"
										size="sm"
										type="button"
										onClick={() => setSignPdfPage((p) => Math.max(1, p - 1))}
										disabled={signPdfPage <= 1}
										className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
										title="Previous page"
									>
										<CaretLeftIcon className="size-5" />
									</Button>
									<span className="min-w-11 text-center text-xs font-medium tabular-nums text-muted-foreground">
										{signPdfTotalDisplay == null
											? `${signPdfPage} / …`
											: `${signPdfPage} / ${signPdfTotalDisplay}`}
									</span>
									<Button
										variant="ghost"
										size="sm"
										type="button"
										onClick={() =>
											setSignPdfPage((p) =>
												signPdfTotalDisplay == null
													? p + 1
													: Math.min(signPdfTotalDisplay, p + 1),
											)
										}
										disabled={
											signPdfTotalDisplay != null &&
											signPdfPage >= signPdfTotalDisplay
										}
										className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
										title="Next page"
									>
										<CaretRightIcon className="size-5" />
									</Button>
								</>
							)}
						</div>

						<div className="w-px h-6 bg-border mx-2" />

						{/* Action tools */}
						<div className="flex items-center gap-3">
							<Button
								variant="ghost"
								size="sm"
								onClick={handleDownload}
								disabled={!fileData}
								className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
								title="Download file"
							>
								<FileArrowDownIcon className="size-5" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleDownloadCompliancePdf}
								disabled={pdfExportBusy}
								className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
								title="Download compliance report"
							>
								<ScrollIcon className="size-5" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleDownloadDocumentWithCompliancePdf}
								disabled={!fileData || pdfExportBusy}
								className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
								title="Download document with proof"
							>
								<DownloadIcon className="size-5" />
							</Button>
						</div>

						{canSign && signerAddress && (
							<>
								<div className="w-px h-6 bg-border mx-2" />
								<Button
									variant="primary"
									size="sm"
									onClick={() => void handleSign()}
									disabled={signFile.isPending || !canSubmitPlacementSign}
								>
									{signFile.isPending ? (
										<>
											<SpinnerIcon className="size-4 animate-spin" />
											Signing…
										</>
									) : (
										"Sign document"
									)}
								</Button>
							</>
						)}
					</div>
				</div>
			</div>

			{/* Main content area with aside for signature status */}
			<div className="flex-1 flex overflow-hidden bg-muted/5">
				{/* Document viewer */}
				<div ref={containerRef} className="flex-1 h-full overflow-auto">
					<div
						ref={documentRef}
						className="relative w-full h-full bg-background"
					>
						{renderFileContent()}
					</div>
				</div>

				{/* Signature Status Aside */}
				<aside className="hidden lg:block w-72 border-l border-border bg-background overflow-y-auto">
					<div className="p-4 space-y-4">
						<h3 className="font-semibold text-sm flex items-center gap-2">
							<ScrollIcon className="size-4" />
							Signature Status
						</h3>

						{/* Progress summary */}
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">Progress</span>
							<span className="font-medium">
								{file.signatures?.length || 0} of {file.signers?.length || 0}{" "}
								signed
							</span>
						</div>
						<div className="h-2 bg-muted rounded-full overflow-hidden">
							<div
								className="h-full bg-chart-2 transition-all duration-500"
								style={{
									width: `${file.signers?.length ? ((file.signatures?.length || 0) / file.signers.length) * 100 : 0}%`,
								}}
							/>
						</div>

						{(canSign || alreadySigned) && myPlacementFields.length > 0 && (
							<div className="space-y-2 rounded-lg border border-border bg-muted/25 p-3">
								<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									Your fields
								</h4>
								<p className="text-[11px] leading-snug text-muted-foreground">
									{alreadySigned
										? "Your signature is recorded. Field markers show where you signed."
										: "Tap the highlighted regions on the document (or the list below for other pages). Every required field must be marked before you can sign."}
								</p>
								<ul className="space-y-1.5">
									{myPlacementFields.map((field) => {
										const done = isMyPlacementFieldDone(field.id);
										return (
											<li
												key={field.id}
												className="flex items-center justify-between gap-2 text-xs"
											>
												<button
													type="button"
													disabled={alreadySigned}
													className={cn(
														"min-w-0 flex-1 truncate text-left underline-offset-2 hover:underline disabled:cursor-default disabled:no-underline disabled:opacity-100",
														done &&
															(alreadySigned
																? "font-medium text-emerald-700 dark:text-emerald-400"
																: "text-muted-foreground line-through"),
													)}
													onClick={() => togglePlacementField(field.id)}
												>
													{field.type} · p.{field.pageIndex + 1}
													{field.required ? " · required" : ""}
													{alreadySigned && done ? " · signed" : ""}
												</button>
												{done ? (
													<CheckIcon
														className="size-3.5 shrink-0 text-emerald-600"
														weight="bold"
													/>
												) : (
													<ClockIcon className="size-3.5 shrink-0 text-muted-foreground" />
												)}
											</li>
										);
									})}
								</ul>
								{canSign && !canSubmitPlacementSign && (
									<p className="text-[11px] text-amber-800 dark:text-amber-200">
										Complete every required field to enable Sign.
									</p>
								)}
							</div>
						)}

						{/* Signer list */}
						<div className="space-y-2 pt-2">
							{(file.signers || []).map(
								(
									signer:
										| string
										| {
												wallet: string;
												name: string | null;
												email: string | null;
										  },
								) => {
									const signerWallet =
										typeof signer === "string" ? signer : signer.wallet;
									const signature = file.signatures?.find(
										(s) =>
											s.signer.toLowerCase() === signerWallet.toLowerCase(),
									);
									const hasSigned = Boolean(signature);
									const isYou =
										signerAddress?.toLowerCase() === signerWallet.toLowerCase();
									const signerName =
										typeof signer === "string" ? null : signer.name;
									const signerEmail =
										typeof signer === "string" ? null : signer.email;
									const displayName = signerName || formatAddress(signerWallet);

									return (
										<div
											key={signerWallet}
											className={cn(
												"flex items-center gap-3 p-3 rounded-lg border",
												hasSigned
													? "bg-chart-2/10 border-chart-2/30"
													: "bg-muted/30 border-border",
											)}
										>
											<div
												className={cn(
													"size-8 rounded-full flex items-center justify-center shrink-0",
													hasSigned ? "bg-chart-2" : "bg-muted",
												)}
											>
												{hasSigned ? (
													<CheckIcon
														className="size-4 text-white"
														weight="bold"
													/>
												) : (
													<ClockIcon className="size-4 text-muted-foreground" />
												)}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium truncate">
													{displayName}
													{isYou && (
														<span className="text-xs text-muted-foreground ml-1">
															(You)
														</span>
													)}
												</p>
												{signerEmail && (
													<p className="text-xs text-muted-foreground truncate">
														{signerEmail}
													</p>
												)}
												<p
													className={cn(
														"text-xs",
														hasSigned
															? "text-chart-2"
															: "text-muted-foreground",
													)}
												>
													{hasSigned ? "Signed" : "Pending"}
												</p>
											</div>
											{signature?.onchainTxHash && (
												<a
													href={`${defaultChain.blockExplorers?.default?.url}/tx/${signature.onchainTxHash}`}
													target="_blank"
													rel="noopener noreferrer"
													className="text-muted-foreground hover:text-foreground"
													title="View on explorer"
												>
													<ArrowSquareOutIcon className="size-4" />
												</a>
											)}
										</div>
									);
								},
							)}
						</div>

						{/* Viewers section */}
						{file.viewers && file.viewers.length > 0 && (
							<div className="pt-4 border-t border-border">
								<h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
									Viewers ({file.viewers.length})
								</h4>
								<div className="space-y-2">
									{file.viewers.map(
										(
											viewer:
												| string
												| {
														wallet: string;
														name: string | null;
														email: string | null;
												  },
										) => {
											const viewerWallet =
												typeof viewer === "string" ? viewer : viewer.wallet;
											const viewerName =
												typeof viewer === "string" ? null : viewer.name;
											const viewerEmail =
												typeof viewer === "string" ? null : viewer.email;
											const displayName =
												viewerName || formatAddress(viewerWallet);

											return (
												<div
													key={viewerWallet}
													className="flex items-center gap-3 p-2 rounded-lg bg-muted/20"
												>
													<div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0">
														<UserIcon className="size-3 text-muted-foreground" />
													</div>
													<div className="flex-1 min-w-0">
														<p className="text-sm text-muted-foreground truncate">
															{displayName}
															{signerAddress?.toLowerCase() ===
																viewerWallet.toLowerCase() && (
																<span className="text-xs ml-1">(You)</span>
															)}
														</p>
														{viewerEmail && (
															<p className="text-xs text-muted-foreground/70 truncate">
																{viewerEmail}
															</p>
														)}
													</div>
												</div>
											);
										},
									)}
								</div>
							</div>
						)}
					</div>
				</aside>
			</div>
		</div>
	);
}
