import DocumentSharedEmail from "./document-shared";

/** Cold-invite preview for `email dev` */
export default function DocumentSharedColdPreview() {
	return (
		<DocumentSharedEmail
			senderLabel="Alex Chen"
			ctaHref="https://app.filosign.com/?coldPieceCid=example&coldInvite=token"
			variant="cold"
		/>
	);
}
