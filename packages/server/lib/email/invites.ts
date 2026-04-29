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

type SendInviteEmailArgs = {
	to: string;
	senderWallet: Address;
	senderName?: string | null;
	message?: string | null;
	inviteId: string;
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

	const subject = `${senderLabel} sent you a Filosign request`;
	const text = [
		`${senderLabel} sent you a Filosign request.`,
		"",
		`Sender wallet: ${args.senderWallet}`,
		`Recipient wallet: ${args.recipientWallet}`,
		...(args.message?.trim() ? ["", `Message: ${args.message.trim()}`] : []),
		"",
		`Open Filosign with the recipient wallet to review the request: ${requestUrl}`,
	].join("\n");

	const html = `
		<div style="font-family: Inter, Arial, sans-serif; color: #111827; line-height: 1.5; max-width: 560px;">
			<h1 style="font-size: 22px; margin: 0 0 12px;">You have a Filosign request</h1>
			<p style="margin: 0 0 16px;">
				${escapedSenderLabel} sent a request to your wallet on Filosign.
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
				Open Filosign and log in with the recipient wallet above. The request will be waiting in your permissions page.
			</p>
			<a href="${requestUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 10px 14px; font-weight: 600;">
				Open Filosign
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

export async function sendInviteEmail(args: SendInviteEmailArgs) {
	const appUrl = env.FRONTEND_URL.replace(/\/$/, "");
	const inviteUrl = `${appUrl}/invite/${args.inviteId}`;
	const senderLabel =
		args.senderName?.trim() || formatAddress(args.senderWallet);
	const escapedSenderLabel = escapeHtml(senderLabel);
	const escapedSenderWallet = escapeHtml(args.senderWallet);
	const escapedMessage = args.message?.trim()
		? escapeHtml(args.message.trim())
		: null;

	const subject = `${senderLabel} wants to send you documents on Filosign`;
	const text = [
		`${senderLabel} wants to send you secure documents on Filosign.`,
		"",
		`From: ${args.senderWallet}`,
		...(args.message?.trim() ? ["", `Message: ${args.message.trim()}`] : []),
		"",
		"Filosign is an end-to-end encrypted document signing platform.",
		"Join for free to receive documents:",
		inviteUrl,
	].join("\n");

	const html = `
		<div style="font-family: Inter, Arial, sans-serif; color: #111827; line-height: 1.5; max-width: 560px;">
			<h1 style="font-size: 22px; margin: 0 0 12px;">Someone wants to send you documents</h1>
			<p style="margin: 0 0 16px;">
				<strong>${escapedSenderLabel}</strong> wants to send you secure, encrypted documents on Filosign.
			</p>
			<div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 0 0 16px;">
				<p style="margin: 0;"><strong>From wallet:</strong><br />${escapedSenderWallet}</p>
			</div>
			${
				escapedMessage
					? `<blockquote style="border-left: 3px solid #111827; margin: 0 0 16px; padding-left: 12px; color: #374151;">${escapedMessage}</blockquote>`
					: ""
			}
			<p style="margin: 0 0 12px;">
				<strong>What is Filosign?</strong>
			</p>
			<p style="margin: 0 0 20px; color: #374151;">
				An end-to-end encrypted document signing platform. Your documents are encrypted in your browser 
				and stored on the blockchain - only you and the sender can access them.
			</p>
			<a href="${inviteUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 10px 14px; font-weight: 600;">
				Join Filosign Free
			</a>
			<p style="margin: 16px 0 0; font-size: 12px; color: #6b7280;">
				No crypto knowledge required. We cover all fees.
			</p>
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
	const documentUrl = `${appUrl}/dashboard}`;
	const senderLabel =
		args.senderName?.trim() || formatAddress(args.senderWallet);
	const escapedSenderLabel = escapeHtml(senderLabel);
	const escapedSenderWallet = escapeHtml(args.senderWallet);
	const escapedRecipientWallet = escapeHtml(args.recipientWallet);
	const escapedPieceCid = escapeHtml(args.pieceCid);

	const subject = `${senderLabel} sent you a document on Filosign`;
	const text = [
		`${senderLabel} sent you a document on Filosign.`,
		"",
		`Sender wallet: ${args.senderWallet}`,
		`Recipient wallet: ${args.recipientWallet}`,
		`Document: ${args.pieceCid}`,
		"",
		`Open Filosign with the recipient wallet to review it: ${documentUrl}`,
	].join("\n");

	const html = `
		<div style="font-family: Inter, Arial, sans-serif; color: #111827; line-height: 1.5; max-width: 560px;">
			<h1 style="font-size: 22px; margin: 0 0 12px;">You have received a new document</h1>
			<p style="margin: 0 0 16px;">
				${escapedSenderLabel} sent a document to your wallet on Filosign.
			</p>
			<div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 0 0 16px;">
				<p style="margin: 0 0 8px;"><strong>Sender wallet:</strong><br />${escapedSenderWallet}</p>
				<p style="margin: 0 0 8px;"><strong>Recipient wallet:</strong><br />${escapedRecipientWallet}</p>
				<p style="margin: 0;"><strong>Document:</strong><br />${escapedPieceCid}</p>
			</div>
			<p style="margin: 0 0 20px;">
				Open Filosign and log in with the recipient wallet above. The document will be waiting in your received documents.
			</p>
			<a href="${documentUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 10px 14px; font-weight: 600;">
				Open Filosign
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
