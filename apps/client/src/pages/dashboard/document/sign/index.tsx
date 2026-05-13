import { FileTextIcon } from "@phosphor-icons/react";
import { ColdInviteSignDocument } from "./ColdInviteSignDocument";
import { useSignDocumentMode } from "./useSignDocumentMode";
import { WarmSignDocumentPage } from "./warm/WarmSignDocumentPage";

export default function SignDocumentPage() {
	const mode = useSignDocumentMode();
	if (mode.mode === "invalid") {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4">
				<FileTextIcon className="size-14 text-muted-foreground" />
				<h1 className="text-lg font-semibold">Invalid document link</h1>
				<p className="text-sm text-muted-foreground text-center max-w-sm">
					This invite link is missing the document id. Ask the sender to resend
					the email.
				</p>
			</div>
		);
	}
	if (mode.mode === "cold") {
		return (
			<ColdInviteSignDocument
				pieceCid={mode.pieceCid}
				inviteToken={mode.inviteToken}
			/>
		);
	}
	return <WarmSignDocumentPage />;
}
