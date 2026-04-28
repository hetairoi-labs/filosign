import { Resend } from "resend";
import type { Address } from "viem";
import env from "@/env";

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function formatAddress(address: Address) {
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

type SendShareRequestEmailArgs = {
	to: string;
	senderWallet: Address;
	recipientWallet: Address;
	senderName?: string | null;
	message?: string | null;
};

type SendDocumentReceivedEmailArgs = {
	to: string;
	senderWallet: Address;
	recipientWallet: Address;
	pieceCid: string;
	senderName?: string | null;
};

const resend = new Resend(env.RESEND_API_KEY);

export async function sendShareRequestEmail(args: SendShareRequestEmailArgs) {
	const appUrl = env.FRONTEND_URL.replace(/\/$/, "");
	const requestUrl = `${appUrl}/dashboard/settings/permissions`;
	const senderLabel =
		args.senderName?.trim() || formatAddress(args.senderWallet);
	const escapedSenderLabel = escapeHtml(senderLabel);
	const escapedSenderWallet = escapeHtml(args.senderWallet);
	const escapedRecipientWallet = escapeHtml(args.recipientWallet);
	const escapedMessage = args.message?.trim()
		? escapeHtml(args.message.trim())
		: null;

	const subject = `${senderLabel} sent you a FiloSign request`;
	const text = [
		`${senderLabel} sent you a FiloSign request.`,
		"",
		`Sender wallet: ${args.senderWallet}`,
		`Recipient wallet: ${args.recipientWallet}`,
		...(args.message?.trim() ? ["", `Message: ${args.message.trim()}`] : []),
		"",
		`Open FiloSign with the recipient wallet to review the request: ${requestUrl}`,
	].join("\n");

	const html = `
		<div style="font-family: Inter, Arial, sans-serif; color: #111827; line-height: 1.5; max-width: 560px;">
			<h1 style="font-size: 22px; margin: 0 0 12px;">You have a FiloSign request</h1>
			<p style="margin: 0 0 16px;">
				${escapedSenderLabel} sent a request to your wallet on FiloSign.
			</p>
			<div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 0 0 16px;">
				<p style="margin: 0 0 8px;"><strong>Sender wallet:</strong><br />${escapedSenderWallet}</p>
				<p style="margin: 0;"><strong>Recipient wallet:</strong><br />${escapedRecipientWallet}</p>
			</div>
			${
				escapedMessage
					? `<blockquote style="border-left: 3px solid #111827; margin: 0 0 16px; padding-left: 12px; color: #374151;">${escapedMessage}</blockquote>`
					: ""
			}
			<p style="margin: 0 0 20px;">
				Open FiloSign and log in with the recipient wallet above. The request will be waiting in your permissions page.
			</p>
			<a href="${requestUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 10px 14px; font-weight: 600;">
				Open FiloSign
			</a>
		</div>
	`;

	const { error } = await resend.emails.send({
		from: env.RESEND_FROM_EMAIL,
		to: args.to,
		subject,
		text,
		html,
		replyTo: env.RESEND_FROM_EMAIL,
	});

	if (error) {
		throw new Error(error.message);
	}
}

export async function sendDocumentReceivedEmail(
	args: SendDocumentReceivedEmailArgs,
) {
	const appUrl = env.FRONTEND_URL.replace(/\/$/, "");
	const documentUrl = `${appUrl}/dashboard/document/sign?pieceCid=${encodeURIComponent(args.pieceCid)}`;
	const senderLabel =
		args.senderName?.trim() || formatAddress(args.senderWallet);
	const escapedSenderLabel = escapeHtml(senderLabel);
	const escapedSenderWallet = escapeHtml(args.senderWallet);
	const escapedRecipientWallet = escapeHtml(args.recipientWallet);
	const escapedPieceCid = escapeHtml(args.pieceCid);

	const subject = `${senderLabel} sent you a document on FiloSign`;
	const text = [
		`${senderLabel} sent you a document on FiloSign.`,
		"",
		`Sender wallet: ${args.senderWallet}`,
		`Recipient wallet: ${args.recipientWallet}`,
		`Document: ${args.pieceCid}`,
		"",
		`Open FiloSign with the recipient wallet to review it: ${documentUrl}`,
	].join("\n");

	const html = `
		<div style="font-family: Inter, Arial, sans-serif; color: #111827; line-height: 1.5; max-width: 560px;">
			<h1 style="font-size: 22px; margin: 0 0 12px;">You have a FiloSign document</h1>
			<p style="margin: 0 0 16px;">
				${escapedSenderLabel} sent a document to your wallet on FiloSign.
			</p>
			<div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 0 0 16px;">
				<p style="margin: 0 0 8px;"><strong>Sender wallet:</strong><br />${escapedSenderWallet}</p>
				<p style="margin: 0 0 8px;"><strong>Recipient wallet:</strong><br />${escapedRecipientWallet}</p>
				<p style="margin: 0;"><strong>Document:</strong><br />${escapedPieceCid}</p>
			</div>
			<p style="margin: 0 0 20px;">
				Open FiloSign and log in with the recipient wallet above. The document will be waiting in your received documents.
			</p>
			<a href="${documentUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 10px 14px; font-weight: 600;">
				Open Document
			</a>
		</div>
	`;

	const { error } = await resend.emails.send({
		from: env.RESEND_FROM_EMAIL,
		to: args.to,
		subject,
		text,
		html,
		replyTo: env.RESEND_FROM_EMAIL,
	});

	if (error) {
		throw new Error(error.message);
	}
}
