import {
	ArrowLeftIcon,
	CheckCircleIcon,
	FileTextIcon,
	SpinnerIcon,
} from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { ColdShareDialog } from "../../../envelope/create/add-sign/_components/ColdShareDialog";
import { SignDocumentShell } from "../_components/SignDocumentShell";
import { useWarmSignDocument } from "./useWarmSignDocument";
import { WarmSignDocumentBody } from "./WarmSignDocumentBody";
import { WarmSignSidebar } from "./WarmSignSidebar";
import { WarmSignStickyHeader } from "./WarmSignStickyHeader";

export function WarmSignDocumentPage() {
	const warm = useWarmSignDocument();
	const {
		navigation,
		fileQuery,
		identity,
		placement,
		viewer,
		signing,
		incentive,
		meta,
		compliance,
		coldShare,
		refs,
		acknowledge,
	} = warm;

	const { navigate, pieceCid } = navigation;
	const { file, fileLoading, fileError, acknowledgeFile } = fileQuery;

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
						onClick={() => void acknowledge.handleAcknowledge()}
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
		<SignDocumentShell
			stickyHeader={
				<WarmSignStickyHeader
					navigation={navigation}
					file={file}
					pieceCid={pieceCid}
					identity={identity}
					signing={signing}
					incentive={incentive}
					meta={meta}
					viewer={viewer}
					compliance={compliance}
					coldShare={coldShare}
					placement={placement}
				/>
			}
			body={
				<>
					<WarmSignDocumentBody
						containerRef={refs.containerRef}
						documentRef={refs.documentRef}
						fileContent={{
							pieceCid,
							viewError: viewer.viewError,
							fileData: viewer.fileData,
							viewFilePending: viewer.viewFile.isPending,
							handleViewFile: viewer.handleViewFile,
							zoom: viewer.zoom,
							myPlacementFields: placement.myPlacementFields,
							alreadySigned: signing.alreadySigned,
							isMyPlacementFieldDone: placement.isMyPlacementFieldDone,
							togglePlacementField: placement.togglePlacementField,
							previewPdfBytes: viewer.previewPdfBytes,
							signPdfPage: viewer.signPdfPage,
							setSignPdfPage: viewer.setSignPdfPage,
							setSignPdfNumPages: viewer.setSignPdfNumPages,
							handleDownload: compliance.handleDownload,
							canSign: signing.canSign,
						}}
					/>
					<WarmSignSidebar
						file={file}
						identity={identity}
						placement={placement}
						signing={signing}
						meta={meta}
					/>
				</>
			}
		>
			<ColdShareDialog
				open={coldShare.coldShareDialogOpen}
				share={coldShare.coldShare}
				onDone={() => {
					coldShare.setColdShareDialogOpen(false);
					coldShare.setColdShare(null);
				}}
			/>
		</SignDocumentShell>
	);
}
