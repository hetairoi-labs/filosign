import { useFilosignContext } from "@filosign/react";
import {
	type FileInfo,
	useFileInfo,
	useViewFile,
	type ViewFileResult,
} from "@filosign/react/hooks";
import {
	ArrowClockwiseIcon,
	ArrowCounterClockwiseIcon,
	DownloadIcon,
	FileIcon,
	MagnifyingGlassIcon,
	MagnifyingGlassMinusIcon,
	MagnifyingGlassPlusIcon,
	ScrollIcon,
	StackIcon,
	XIcon,
} from "@phosphor-icons/react";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { defaultChain, erc20DisplayForChain } from "@/src/constants";
import {
	buildCompliancePdfOnly,
	buildDocumentPlusCompliancePdf,
	downloadPdfBytes,
	fetchSignerIncentivesForCompliancePdf,
} from "@/src/lib/utils/compliance-pdf";
import { Button } from "../ui/button";
import { Loader } from "../ui/loader";

interface FileObject {
	pieceCid: string;
	sender: string;
	status: string;
	type?: "sent" | "received";
}

interface FileViewerProps {
	file: FileObject | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function toViewFileResult(fd: {
	fileBytes: Uint8Array;
	metadata: { name: string; mimeType?: string };
	sender: string;
	timestamp: number;
}): ViewFileResult {
	return {
		fileBytes: fd.fileBytes,
		sender: fd.sender as `0x${string}`,
		timestamp: fd.timestamp,
		metadata: {
			name: fd.metadata.name,
			mimeType: fd.metadata.mimeType ?? "application/octet-stream",
		},
	};
}

export function FileViewer({ file, open, onOpenChange }: FileViewerProps) {
	const [zoom, setZoom] = useState(75);
	const [viewError, setViewError] = useState<string | null>(null);
	const [pdfExportBusy, setPdfExportBusy] = useState(false);
	const [fileData, setFileData] = useState<{
		fileBytes: Uint8Array;
		metadata: { name: string; mimeType: string };
		sender: string;
		timestamp: number;
		signaturePositionOffset?: { top: number; left: number };
	} | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [documentDimensions, setDocumentDimensions] = useState({
		width: 600,
		height: 800,
	});

	const { wallet, contracts } = useFilosignContext();

	// Get detailed file info including decryption keys
	const { data: fileInfo, isLoading: fileLoading } = useFileInfo({
		pieceCid: file?.pieceCid,
	});

	const viewFile = useViewFile();

	// Determine if current user is the sender or receiver
	const isSender =
		wallet?.account?.address?.toLowerCase() === fileInfo?.sender?.toLowerCase();

	// Detect mobile/desktop and set responsive dimensions
	useEffect(() => {
		const checkMobile = () => {
			const mobile = window.innerWidth < 768;
			setDocumentDimensions(
				mobile ? { width: 300, height: 400 } : { width: 600, height: 800 },
			);
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	// Memoize the handleViewFile function
	const handleViewFile = useCallback(async () => {
		if (!fileInfo) {
			setViewError("File information not available");
			return;
		}

		// Server returns current user's participant keys (works for both sender and receiver)
		const { kemCiphertext, encryptedEncryptionKey } = fileInfo;

		if (!kemCiphertext || !encryptedEncryptionKey) {
			setViewError(
				`Missing decryption keys. ${!isSender ? "Acknowledge the file first." : ""}`,
			);
			return;
		}

		try {
			setViewError(null);
			console.log("Starting file decryption...");
			const result = await viewFile.mutateAsync({
				pieceCid: fileInfo.pieceCid,
				kemCiphertext,
				encryptedEncryptionKey,
				status: fileInfo.status as "s3" | "foc",
			});
			console.log("File decryption successful:", {
				hasFileBytes: !!result?.fileBytes,
				bytesLength: result?.fileBytes?.length,
				metadata: result?.metadata,
			});

			// Store the decrypted file data in state
			setFileData(result);
		} catch (error) {
			console.error("Failed to load file:", error);
			const errorMessage =
				error instanceof Error
					? error.message
					: "Failed to load file for viewing";
			setViewError(errorMessage);
			toast.error(errorMessage);
		}
	}, [fileInfo, viewFile, isSender]);

	// Load file data when component mounts or file changes
	useEffect(() => {
		if (!fileInfo || fileData || viewFile.isPending) return;

		// Server returns keys only when user can read (acked or sender)
		const hasRequiredKeys =
			fileInfo.kemCiphertext && fileInfo.encryptedEncryptionKey;

		if (hasRequiredKeys) {
			handleViewFile();
		}
	}, [fileInfo, fileData, viewFile.isPending, handleViewFile]);

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
			a.download =
				fileData.metadata.name || `document-${file?.pieceCid.slice(0, 8)}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toast.success("File downloaded!");
		}
	}, [fileData, file]);

	const handleDownloadCompliancePdf = useCallback(async () => {
		if (!fileInfo || !file?.pieceCid) return;
		setPdfExportBusy(true);
		try {
			const explorerBase = defaultChain.blockExplorers?.default?.url ?? null;
			const signerIncentives = contracts?.FSFileRegistry?.read
				? await fetchSignerIncentivesForCompliancePdf(
						contracts.FSFileRegistry.read,
						file.pieceCid,
						fileInfo.signers,
						erc20DisplayForChain,
					)
				: undefined;
			const bytes = await buildCompliancePdfOnly({
				file: fileInfo as FileInfo,
				fileData: fileData ? toViewFileResult(fileData) : null,
				chainName: defaultChain.name,
				explorerBaseUrl: explorerBase,
				exportedAtIso: new Date().toISOString(),
				signerIncentives,
			});
			const safe = file.pieceCid.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
			downloadPdfBytes(bytes, `filosign-file-record-${safe}`);
			toast.success("Compliance PDF downloaded");
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : "Could not create compliance PDF",
			);
		} finally {
			setPdfExportBusy(false);
		}
	}, [contracts?.FSFileRegistry?.read, file?.pieceCid, fileData, fileInfo]);

	const handleDownloadDocumentWithCompliancePdf = useCallback(async () => {
		if (!fileInfo || !file?.pieceCid || !fileData) {
			toast.error("Load the document first to bundle with the compliance PDF.");
			return;
		}
		setPdfExportBusy(true);
		try {
			const explorerBase = defaultChain.blockExplorers?.default?.url ?? null;
			const signerIncentives = contracts?.FSFileRegistry?.read
				? await fetchSignerIncentivesForCompliancePdf(
						contracts.FSFileRegistry.read,
						file.pieceCid,
						fileInfo.signers,
						erc20DisplayForChain,
					)
				: undefined;
			const bytes = await buildDocumentPlusCompliancePdf({
				file: fileInfo as FileInfo,
				fileData: toViewFileResult(fileData),
				chainName: defaultChain.name,
				explorerBaseUrl: explorerBase,
				exportedAtIso: new Date().toISOString(),
				signerIncentives,
			});
			const safe = file.pieceCid.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
			downloadPdfBytes(bytes, `filosign-document-with-record-${safe}`);
			toast.success("PDF with document and compliance appendix downloaded");
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : "Could not create bundled PDF",
			);
		} finally {
			setPdfExportBusy(false);
		}
	}, [contracts?.FSFileRegistry?.read, file?.pieceCid, fileData, fileInfo]);

	// Handle escape key to close
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onOpenChange(false);
			}
		};

		if (open) {
			document.addEventListener("keydown", handleEscape);
			document.body.style.overflow = "hidden";
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
			document.body.style.overflow = "unset";
		};
	}, [open, onOpenChange]);

	const handleBackdropClick = useCallback(
		(e: React.MouseEvent) => {
			if (e.target === e.currentTarget) {
				onOpenChange(false);
			}
		},
		[onOpenChange],
	);

	const renderFileContent = () => {
		// Show error if decryption failed
		if (viewError) {
			return (
				<div className="flex items-center justify-center w-full h-full text-sm text-muted-foreground p-4 text-center">
					<div className="flex flex-col items-center gap-3 md:gap-4">
						<FileIcon className="size-12 md:size-16 text-destructive/50" />
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
						<FileIcon className="size-12 md:size-16 text-muted-foreground/50" />
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
				<div className="flex items-center justify-center w-full h-full p-4 md:p-8 bg-muted/5">
					<div
						className="relative bg-white border shadow-lg border-border"
						style={{
							width: documentDimensions.width,
							height: documentDimensions.height,
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
					</div>
				</div>
			);
		}

		// Handle PDF files
		if (
			mimeType === "application/pdf" ||
			fileName?.toLowerCase().endsWith(".pdf")
		) {
			const arrayBuffer = new ArrayBuffer(fileBytes.length);
			new Uint8Array(arrayBuffer).set(fileBytes);
			const blob = new Blob([arrayBuffer], { type: "application/pdf" });
			const pdfUrl = URL.createObjectURL(blob);

			return (
				<div className="flex items-center justify-center w-full h-full p-4 md:p-8 bg-muted/5">
					<div
						className="relative bg-white border shadow-lg border-border"
						style={{
							width: documentDimensions.width,
							height: documentDimensions.height,
							transform: `scale(${zoom / 100})`,
							transformOrigin: "center",
						}}
					>
						<iframe
							src={pdfUrl}
							className="absolute inset-0 w-full h-full border-0"
							title={fileName || "PDF Document"}
							onLoad={() => {
								setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
							}}
						/>
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
							<FileIcon className="size-12 md:size-16 text-muted-foreground/50" />
							<div className="text-xs md:text-sm">Cannot display text file</div>
						</div>
					</div>
				);
			}
		}

		// Fallback for other file types
		return (
			<div className="flex items-center justify-center w-full h-full text-sm text-muted-foreground p-4 text-center">
				<div className="flex flex-col items-center gap-3 md:gap-4">
					<FileIcon className="size-12 md:size-16 text-muted-foreground/50" />
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
			</div>
		);
	};

	const toolbarIconClass = "size-6 @md:size-7";
	const toolbarBtnClass =
		"shrink-0 p-0 h-10 w-10 @md:h-11 @md:w-11 text-muted-foreground hover:text-primary-foreground hover:bg-primary/10";

	if (!open) return null;

	return (
		// biome-ignore lint/a11y/useSemanticElements: full-viewport modal backdrop (click/Escape to close)
		<div
			className="fixed inset-0 z-50 bg-foreground/90 backdrop-blur-sm"
			onClick={handleBackdropClick}
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					onOpenChange(false);
				}
			}}
			role="button"
			tabIndex={0}
		>
			{/* Navbar: title row + toolbar (search left | zoom viewport-center | download · scroll · stack · close) */}
			<div className="absolute top-0 left-0 right-0 z-50 flex-shrink-0 border-b border-border bg-transparent px-4 py-3 @md:px-6 @md:py-4 glass">
				<div className="flex flex-col gap-3 @md:gap-3">
					<div className="flex min-w-0 items-center justify-between gap-3">
						<h2 className="truncate pr-2 text-base font-semibold text-primary-foreground @md:text-lg">
							{fileData?.metadata.name ||
								`Document - ${file?.pieceCid.slice(0, 8)}...`}
						</h2>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onOpenChange(false)}
							aria-label="Close"
							className={`@md:hidden ${toolbarBtnClass}`}
						>
							<XIcon className={toolbarIconClass} />
						</Button>
					</div>

					<div className="relative flex min-h-[48px] w-full items-center">
						{/* Left: search + rotate */}
						<div className="relative z-10 flex min-w-0 flex-1 items-center justify-start gap-1 @md:gap-2">
							<Button
								variant="ghost"
								size="sm"
								type="button"
								title="Search"
								className={toolbarBtnClass}
							>
								<MagnifyingGlassIcon className={toolbarIconClass} />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								type="button"
								title="Rotate counter-clockwise"
								className={toolbarBtnClass}
							>
								<ArrowCounterClockwiseIcon className={toolbarIconClass} />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								type="button"
								title="Rotate clockwise"
								className={toolbarBtnClass}
							>
								<ArrowClockwiseIcon className={toolbarIconClass} />
							</Button>
						</div>

						{/* Zoom — centered on viewport (toolbar row) */}
						<div className="pointer-events-none absolute left-1/2 top-1/2 z-0 flex -translate-x-1/2 -translate-y-1/2">
							<div className="pointer-events-auto flex items-center gap-1 @md:gap-2">
								<Button
									variant="ghost"
									size="sm"
									type="button"
									onClick={handleZoomOut}
									title="Zoom out"
									className={toolbarBtnClass}
								>
									<MagnifyingGlassMinusIcon className={toolbarIconClass} />
								</Button>
								<span className="min-w-[2.75rem] text-center text-sm font-medium tabular-nums text-primary-foreground @md:min-w-[3.25rem] @md:text-base">
									{zoom}%
								</span>
								<Button
									variant="ghost"
									size="sm"
									type="button"
									onClick={handleZoomIn}
									title="Zoom in"
									className={toolbarBtnClass}
								>
									<MagnifyingGlassPlusIcon className={toolbarIconClass} />
								</Button>
							</div>
						</div>

						{/* Right: download · compliance PDF · bundle — close on desktop */}
						<div className="relative z-10 flex min-w-0 flex-1 items-center justify-end gap-1 @md:gap-2">
							<Button
								variant="ghost"
								size="sm"
								type="button"
								onClick={handleDownload}
								disabled={!fileData}
								title="Download file"
								className={toolbarBtnClass}
							>
								<DownloadIcon className={toolbarIconClass} />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								type="button"
								onClick={handleDownloadCompliancePdf}
								disabled={!fileInfo || pdfExportBusy}
								title="Download compliance report (PDF)"
								className={toolbarBtnClass}
							>
								<ScrollIcon className={toolbarIconClass} />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								type="button"
								onClick={handleDownloadDocumentWithCompliancePdf}
								disabled={!fileData || !fileInfo || pdfExportBusy}
								title="Download document + compliance appendix (PDF)"
								className={toolbarBtnClass}
							>
								<StackIcon className={toolbarIconClass} />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								type="button"
								onClick={() => onOpenChange(false)}
								aria-label="Close"
								className={`hidden @md:flex ${toolbarBtnClass}`}
							>
								<XIcon className={toolbarIconClass} />
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="flex flex-col h-screen pt-16 @md:pt-20 overflow-hidden">
				{/* Document Container */}
				<div
					ref={containerRef}
					className="overflow-auto bg-transparent flex items-center justify-center px-4 py-4 @md:px-8 @md:py-8 flex-1"
				>
					{(fileLoading || viewFile.isPending) && (
						<div className="flex items-center justify-center w-full h-full">
							<Loader
								text={
									fileLoading ? "Preparing document..." : "Loading document..."
								}
							/>
						</div>
					)}
					{!fileLoading &&
						!viewFile.isPending &&
						fileInfo &&
						renderFileContent()}
				</div>
			</div>
		</div>
	);
}
