import { Text } from "@react-email/components";
import { FilosignLayout } from "./_components/FilosignLayout";

export type DocumentSharedVariant = "warm" | "cold";

export type DocumentSharedEmailProps = {
	/** Pre-escaped sender display name */
	senderLabel: string;
	ctaHref: string;
	variant: DocumentSharedVariant;
};

const disclaimer = (
	<>
		If you didn&apos;t request this,
		<br />
		please ignore this email.
	</>
);

function copyForVariant(variant: DocumentSharedVariant, senderLabel: string) {
	if (variant === "cold") {
		return {
			title: "A document was shared with you",
			preheader: `${senderLabel} shared a document on Filosign. Open the link, then enter their passphrase.`,
			body: (
				<>
					<strong>{senderLabel}</strong> sent you a document on Filosign. Open
					the link below, then enter the six-word passphrase they send you
					through another channel (for example a message or call).
				</>
			),
		};
	}
	return {
		title: "You have a document to review",
		preheader: `${senderLabel} sent you a document on Filosign. Sign in with this email to open it.`,
		body: (
			<>
				<strong>{senderLabel}</strong> sent you a document on Filosign. Sign in
				with this email to open it.
			</>
		),
	};
}

export default function DocumentSharedEmail({
	senderLabel,
	ctaHref,
	variant,
}: DocumentSharedEmailProps) {
	const copy = copyForVariant(variant, senderLabel);

	return (
		<FilosignLayout
			title={copy.title}
			preheader={copy.preheader}
			ctaHref={ctaHref}
			ctaLabel="Open document"
			disclaimer={disclaimer}
		>
			<Text className="font-16 text-fg-2 mx-auto mt-0 mb-8 max-w-[380px] text-center font-sans">
				{copy.body}
			</Text>
		</FilosignLayout>
	);
}

DocumentSharedEmail.PreviewProps = {
	senderLabel: "Alex Chen",
	ctaHref: "https://app.filosign.com/dashboard/document/sign?pieceCid=example",
	variant: "warm",
} satisfies DocumentSharedEmailProps;
