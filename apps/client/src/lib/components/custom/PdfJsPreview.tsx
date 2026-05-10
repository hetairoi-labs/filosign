import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Document, Page } from "react-pdf";
import { configurePdfWorker } from "@/src/lib/pdf/configurePdfWorker";
import { cn } from "@/src/lib/utils";

function normalizeFile(file: string | ArrayBuffer | Uint8Array) {
	if (typeof file === "string") {
		return file;
	}
	const u8 = file instanceof Uint8Array ? file : new Uint8Array(file);
	return { data: u8 };
}

export type PdfJsPreviewProps = {
	file: string | ArrayBuffer | Uint8Array;
	/** Remount `Document` when the underlying bytes / URL identity changes. */
	documentKey?: string;
	/** 1-based page (react-pdf convention). */
	pageNumber?: number;
	/** 0-based page index, aligned with {@link PlacementManifest} `pageIndex`. */
	renderPageOverlay?: (pageIndex: number) => ReactNode;
	width: number;
	className?: string;
	maxHeight?: number;
	/** Called once the PDF is parsed (authoritative page count). */
	onNumPagesLoaded?: (numPages: number) => void;
};

/**
 * Renders a PDF page with **pdf.js** (canvas). Prefer this over `<iframe>` / `<object>`
 * so previews work under strict CSP (`object-src 'none'`, tight `frame-src`).
 */
export function PdfJsPreview({
	file,
	documentKey,
	pageNumber = 1,
	renderPageOverlay,
	width,
	className,
	maxHeight,
	onNumPagesLoaded,
}: PdfJsPreviewProps) {
	configurePdfWorker();
	const [loadError, setLoadError] = useState<string | null>(null);

	const fileSource = useMemo(() => normalizeFile(file), [file, documentKey]);

	const docKey =
		documentKey ??
		(typeof file === "string" ? file.slice(0, 128) : "pdf-binary");

	const pageProps = {
		width,
		renderTextLayer: false as const,
		renderAnnotationLayer: false as const,
	};

	const overlayWrap = Boolean(renderPageOverlay);

	/**
	 * Placement manifests normalize field rects against a fixed **width × maxHeight**
	 * box (see add-sign `DocumentViewer` + `buildPlacementManifestForDocument`).
	 * The PDF canvas is usually shorter than `maxHeight`, so the overlay must cover
	 * the full placement grid — not just the page wrapper — or hotspots drift
	 * (often visibly to the right / vertically) versus where the sender clicked.
	 */
	const pageStack = (
		<div className="absolute inset-0">
			<div className="absolute inset-0 flex items-start justify-center overflow-hidden">
				<Page pageNumber={pageNumber} {...pageProps} />
			</div>
			{overlayWrap ? (
				<div className="pointer-events-none absolute inset-0 z-20 [&_button]:pointer-events-auto">
					{renderPageOverlay?.(pageNumber - 1)}
				</div>
			) : null}
		</div>
	);

	return (
		<div
			className={cn("relative overflow-hidden bg-white", className)}
			style={{
				width,
				...(maxHeight == null ? {} : { height: maxHeight, maxHeight }),
			}}
		>
			{loadError ? (
				<div className="flex min-h-[120px] w-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
					{loadError}
				</div>
			) : (
				<Document
					key={docKey}
					file={fileSource}
					onLoadError={(err) =>
						setLoadError(err.message || "Could not load PDF")
					}
					onLoadSuccess={(pdf) => {
						setLoadError(null);
						onNumPagesLoaded?.(pdf.numPages);
					}}
					loading={
						<div className="flex min-h-[120px] w-full items-center justify-center p-4 text-sm text-muted-foreground">
							Loading PDF…
						</div>
					}
				>
					{pageStack}
				</Document>
			)}
		</div>
	);
}
