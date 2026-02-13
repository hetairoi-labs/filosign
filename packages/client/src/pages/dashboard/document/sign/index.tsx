import {
	useFileInfo,
	useSignFile,
	useViewFile,
	type ViewFileResult,
} from "@filosign/react/hooks";
import {
	ArrowLeftIcon,
	DownloadIcon,
	FileTextIcon,
	MagnifyingGlassMinusIcon,
	MagnifyingGlassPlusIcon,
	PrinterIcon,
	SignatureIcon,
} from "@phosphor-icons/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/src/lib/components/ui/button";
import { Loader } from "@/src/lib/components/ui/loader";

export default function SignDocumentPage() {
	const navigate = useNavigate();
	const search = useSearch({ from: "/dashboard/document/sign" });
	const pieceCid = search.pieceCid;

	const {
		data: file,
		isLoading: fileLoading,
		error: fileError,
	} = useFileInfo({ pieceCid });

	const viewFile = useViewFile();
	const signFile = useSignFile();
	const [zoom, setZoom] = useState(100);
	const [viewError, setViewError] = useState<string | null>(null);
	const [fileData, setFileData] = useState<ViewFileResult | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const documentRef = useRef<HTMLDivElement>(null);

	// Memoize the handleViewFile function
	const handleViewFile = useCallback(async () => {
		if (!file || !file.kemCiphertext || !file.encryptedEncryptionKey) {
			setViewError("Missing decryption keys. Acknowledge the file first.");
			return;
		}

		try {
			setViewError(null);
			const result = await viewFile.mutateAsync({
				pieceCid: file.pieceCid,
				kemCiphertext: file.kemCiphertext,
				encryptedEncryptionKey: file.encryptedEncryptionKey,
				status: file.status as "s3" | "foc",
			});
			setFileData(result);
		} catch (error) {
			console.error("Failed to load file:", error);
			const errorMessage =
				error instanceof Error
					? error.message
					: "Failed to load file for signing";
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

	const handleSignFile = async () => {
		if (!file) return;

		try {
			await signFile.mutateAsync({
				pieceCid: file.pieceCid,
			});
			toast.success("Document signed successfully!");
			navigate({ to: "/dashboard" });
		} catch (error) {
			console.error("Failed to sign file:", error);
			toast.error("Failed to sign document");
		}
	};

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

	const handlePrint = useCallback(() => {
		window.print();
	}, []);

	const formatAddress = (address: string) => {
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
				<div className="flex items-center justify-center w-full h-full p-4 md:p-8 bg-muted/5">
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
							width: 600,
							height: 800,
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
							<FileTextIcon className="size-12 md:size-16 text-muted-foreground/50" />
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
			</div>
		);
	};

	// Show loader while authenticating or loading file
	if (fileLoading) {
		return <Loader text="Preparing document..." />;
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
				<h2 className="text-xl font-semibold mb-2">File Not Acknowledged</h2>
				<p className="text-muted-foreground mb-4 text-center max-w-md">
					This document must be acknowledged before it can be viewed and signed.
					Please acknowledge it from your dashboard first.
				</p>
				<Button onClick={() => navigate({ to: "/dashboard" })}>
					<ArrowLeftIcon className="h-4 w-4 mr-2" />
					Back to Dashboard
				</Button>
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
			{/* Header with Controls */}
			<div className="flex-shrink-0 sticky top-0 z-50 bg-background border-b border-border">
				{/* Mobile Header - Two rows */}
				<div className="md:hidden">
					{/* Row 1: Back button and title */}
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
						<h2 className="text-sm font-semibold truncate text-foreground max-w-[60%]">
							{pieceCid.slice(0, 8)}...
						</h2>
					</div>

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
							<span className="text-xs font-medium min-w-[2.5rem] text-center text-foreground">
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
						</div>

						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="sm"
								onClick={handleDownload}
								disabled={!fileData}
								className="text-muted-foreground hover:text-foreground hover:bg-accent/50 size-8 p-0"
							>
								<DownloadIcon className="size-4" />
							</Button>
							<Button
								onClick={handleSignFile}
								disabled={signFile.isPending}
								size="sm"
								variant="primary"
								className="gap-1.5 h-8 px-3 text-xs"
							>
								{signFile.isPending ? (
									<>
										<div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full"></div>
										Signing...
									</>
								) : (
									<>
										<SignatureIcon className="size-3.5" />
										Sign Document
									</>
								)}
							</Button>
						</div>
					</div>
				</div>

				{/* Desktop Header - Single row */}
				<div className="hidden md:flex items-center justify-between px-6 py-3">
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
						<div>
							<h2 className="text-base font-semibold truncate text-foreground">
								Document - {pieceCid.slice(0, 8)}...
							</h2>
							<p className="text-xs text-muted-foreground">
								From {formatAddress(file.sender)}
							</p>
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
								<MagnifyingGlassMinusIcon className="size-4" />
							</Button>
							<span className="text-sm font-medium min-w-[3rem] text-center text-foreground">
								{zoom}%
							</span>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleZoomIn}
								className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
							>
								<MagnifyingGlassPlusIcon className="size-4" />
							</Button>
						</div>

						<div className="w-px h-6 bg-border mx-2" />

						{/* Action tools */}
						<div className="flex items-center gap-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={handlePrint}
								className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
								title="Print"
							>
								<PrinterIcon className="size-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleDownload}
								disabled={!fileData}
								className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
								title="Download"
							>
								<DownloadIcon className="size-4" />
							</Button>
						</div>

						<div className="w-px h-6 bg-border mx-2" />

						{/* Sign Button - Primary Action */}
						<Button
							onClick={handleSignFile}
							disabled={signFile.isPending}
							size="sm"
							variant="primary"
							className="gap-2"
						>
							{signFile.isPending ? (
								<>
									<div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
									Signing...
								</>
							) : (
								<>
									<SignatureIcon className="size-4" />
									Sign Document
								</>
							)}
						</Button>
					</div>
				</div>
			</div>

			{/* Document Content - Full Screen */}
			<div className="flex-1 overflow-hidden bg-muted/5">
				<div ref={containerRef} className="w-full h-full overflow-auto">
					<div
						ref={documentRef}
						className="relative w-full h-full bg-background"
					>
						{viewFile.isPending && (
							<div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
								<Loader
									text="Loading document..."
									size="sm"
									className="min-h-0"
								/>
							</div>
						)}
						{renderFileContent()}
					</div>
				</div>
			</div>
		</div>
	);
}
