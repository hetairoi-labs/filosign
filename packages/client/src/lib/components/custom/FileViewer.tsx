import { useFilosignContext } from "@filosign/react";
import { useFileInfo, useViewFile } from "@filosign/react/hooks";
import {
	ArrowClockwiseIcon,
	ArrowCounterClockwiseIcon,
	DownloadIcon,
	FileIcon,
	MagnifyingGlassIcon,
	MagnifyingGlassMinusIcon,
	MagnifyingGlassPlusIcon,
	PrinterIcon,
	XIcon,
} from "@phosphor-icons/react";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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

export function FileViewer({ file, open, onOpenChange }: FileViewerProps) {
	const [zoom, setZoom] = useState(100);
	const [viewError, setViewError] = useState<string | null>(null);
	const [fileData, setFileData] = useState<{
		fileBytes: Uint8Array;
		metadata: { name: string; mimeType: string };
		sender: string;
		timestamp: number;
		signaturePositionOffset: { top: number; left: number };
	} | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [documentDimensions, setDocumentDimensions] = useState({
		width: 600,
		height: 800,
	});

	const { wallet } = useFilosignContext();

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
	}, [fileInfo, fileData, viewFile.isPending, handleViewFile, isSender]);

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

	const handlePrint = useCallback(() => {
		window.print();
	}, []);

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

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-50 bg-foreground/90 backdrop-blur-sm"
			onClick={handleBackdropClick}
		>
			{/* Responsive Navbar */}
			<div className="absolute top-0 left-0 right-0 z-50 px-4 py-3 @md:px-6 @md:py-4 glass border-b border-border flex-shrink-0">
				<div className="flex flex-col @md:flex-row @md:items-center @md:justify-between gap-3 @md:gap-0">
					{/* File name and close button row on mobile */}
					<div className="flex items-center justify-between @md:hidden">
						<h2 className="text-base font-semibold truncate text-primary-foreground max-w-[60%]">
							{fileData?.metadata.name ||
								`Document - ${file?.pieceCid.slice(0, 8)}...`}
						</h2>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onOpenChange(false)}
							className="text-muted-foreground hover:text-primary-foreground hover:bg-primary/10 size-8 p-0"
						>
							<XIcon className="size-5" />
						</Button>
					</div>

					{/* Desktop header row */}
					<div className="hidden @md:block">
						<h2 className="text-lg font-semibold truncate text-primary-foreground">
							{fileData?.metadata.name ||
								`Document - ${file?.pieceCid.slice(0, 8)}...`}
						</h2>
					</div>

					{/* Tools - responsive layout */}
					<div className="flex items-center justify-between @md:justify-end gap-2 @md:gap-0">
						{/* Mobile: Rotate tools */}
						<div className="flex items-center gap-1 @md:hidden">
							<Button
								variant="ghost"
								size="sm"
								className="text-muted-foreground hover:text-primary-foreground hover:bg-primary/10 size-8 p-0"
							>
								<ArrowCounterClockwiseIcon className="size-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className="text-muted-foreground hover:text-primary-foreground hover:bg-primary/10 size-8 p-0"
							>
								<ArrowClockwiseIcon className="size-4" />
							</Button>
						</div>

						{/* Zoom controls - always visible */}
						<div className="flex items-center gap-1 @md:gap-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={handleZoomOut}
								className="text-muted-foreground hover:text-primary-foreground hover:bg-primary/10 size-8 p-0 @md:size-auto @md:p-2"
							>
								<MagnifyingGlassMinusIcon className="size-4 @md:size-5" />
							</Button>
							<span className="text-sm font-medium min-w-[3rem] text-center text-primary-foreground hidden @sm:inline-block">
								{zoom}%
							</span>
							<span className="text-xs font-medium min-w-[2.5rem] text-center text-primary-foreground @sm:hidden">
								{zoom}%
							</span>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleZoomIn}
								className="text-muted-foreground hover:text-primary-foreground hover:bg-primary/10 size-8 p-0 @md:size-auto @md:p-2"
							>
								<MagnifyingGlassPlusIcon className="size-4 @md:size-5" />
							</Button>
						</div>

						<div className="w-px h-6 bg-border hidden @md:block mx-2" />

						{/* Desktop: Rotate tools */}
						<div className="hidden @md:flex items-center gap-2">
							<Button
								variant="ghost"
								size="sm"
								className="text-muted-foreground hover:text-primary-foreground hover:bg-primary/10"
							>
								<ArrowCounterClockwiseIcon className="size-5" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className="text-muted-foreground hover:text-primary-foreground hover:bg-primary/10"
							>
								<ArrowClockwiseIcon className="size-5" />
							</Button>
						</div>

						<div className="w-px h-6 bg-border hidden @md:block mx-2" />

						{/* Action tools */}
						<div className="flex items-center gap-1 @md:gap-2">
							<Button
								variant="ghost"
								size="sm"
								className="text-muted-foreground hover:text-primary-foreground hover:bg-primary/10 size-8 p-0 @md:size-auto @md:p-2"
							>
								<MagnifyingGlassIcon className="size-4 @md:size-5" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={handlePrint}
								className="text-muted-foreground hover:text-primary-foreground hover:bg-primary/10 size-8 p-0 @md:size-auto @md:p-2"
							>
								<PrinterIcon className="size-4 @md:size-5" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleDownload}
								className="text-muted-foreground hover:text-primary-foreground hover:bg-primary/10 size-8 p-0 @md:size-auto @md:p-2"
							>
								<DownloadIcon className="size-4 @md:size-5" />
							</Button>
						</div>

						<div className="w-px h-6 bg-border hidden @md:block mx-2" />

						{/* Desktop close button */}
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onOpenChange(false)}
							className="text-muted-foreground hover:text-primary-foreground hover:bg-primary/10 hidden @md:flex"
						>
							<XIcon className="size-5" />
						</Button>
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
