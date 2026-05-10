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
	const requestUrl = `${appUrl}/dashboard/connections`;
	const senderLabel =
		args.senderName?.trim() || formatAddress(args.senderWallet);
	const escapedSenderLabel = escapeHtml(senderLabel);
	const escapedMessage = args.message?.trim()
		? escapeHtml(args.message.trim())
		: null;

	const subject = `${senderLabel} wants to send you documents`;
	const text = [
		`${senderLabel} wants to send you secure documents on Filosign.`,
		"",
		...(args.message?.trim() ? [`"${args.message.trim()}"`, ""] : []),
		"To start receiving their documents, approve their connection request:",
		requestUrl,
		"",
		"Go to Settings > Permissions and click Approve.",
	].join("\n");

	const html = `
		<div style="font-family: Inter, Arial, sans-serif; color: #111827; line-height: 1.5; max-width: 560px;">
			<h1 style="font-size: 22px; margin: 0 0 12px;">${escapedSenderLabel} wants to send you documents</h1>
			
			${
				escapedMessage
					? `<blockquote style="background: #f9fafb; border-left: 3px solid #111827; margin: 0 0 16px; padding: 12px 16px; color: #374151; font-style: italic;">"${escapedMessage}"</blockquote>`
					: ""
			}
			
			<p style="margin: 0 0 16px;">
				<strong>${escapedSenderLabel}</strong> wants to send you secure documents. Accept their request to start receiving them.
			</p>
			
			<div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 16px; margin: 0 0 20px;">
				<p style="margin: 0 0 8px; font-weight: 600; color: #166534;">What you need to do:</p>
				<p style="margin: 0; color: #374151;">
					Go to Settings > Permissions and click "Approve" to allow them to send you documents.
				</p>
			</div>
			
			<a href="${requestUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 12px 20px; font-weight: 600;">
				Review Request
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
	const escapedMessage = args.message?.trim()
		? escapeHtml(args.message.trim())
		: null;

	const subject = `${senderLabel} wants to send you documents securely`;
	const text = [
		`${senderLabel} wants to send you secure documents on Filosign.`,
		"",
		...(args.message?.trim() ? [`"${args.message.trim()}"`, ""] : []),
		"Filosign is a secure document platform with legally binding signatures.",
		"",
		"To receive their documents:",
		"1. Click the link below to join",
		"2. Create your account (takes 1 minute)",
		"3. Accept their connection request",
		"4. Start receiving documents",
		"",
		inviteUrl,
		"",
		"It's free to use.",
	].join("\n");

	const html = `
		<div style="font-family: Inter, Arial, sans-serif; color: #111827; line-height: 1.5; max-width: 560px;">
			<h1 style="font-size: 22px; margin: 0 0 12px;">${escapedSenderLabel} wants to send you documents</h1>
			
			${
				escapedMessage
					? `<blockquote style="background: #f9fafb; border-left: 3px solid #111827; margin: 0 0 16px; padding: 12px 16px; color: #374151; font-style: italic;">"${escapedMessage}"</blockquote>`
					: ""
			}
			
			<p style="margin: 0 0 16px;">
				<strong>${escapedSenderLabel}</strong> wants to send you secure, legally binding documents on Filosign.
			</p>
			
			<div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 16px; margin: 0 0 20px;">
				<p style="margin: 0 0 12px; font-weight: 600; color: #166534;">How it works:</p>
				<ol style="margin: 0; padding-left: 20px; color: #374151;">
					<li style="margin-bottom: 8px;">Click below to join (takes 1 minute)</li>
					<li style="margin-bottom: 8px;">Accept their connection request</li>
					<li>Start receiving secure documents</li>
				</ol>
			</div>
			
			<a href="${inviteUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 12px 20px; font-weight: 600;">
				Accept Invitation
			</a>
			
			<p style="margin: 16px 0 0; font-size: 12px; color: #6b7280;">
				Free to use. Your documents are encrypted and legally binding.
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
	const documentUrl = `${appUrl}/dashboard`;
	const senderLabel =
		args.senderName?.trim() || formatAddress(args.senderWallet);
	const escapedSenderLabel = escapeHtml(senderLabel);

	const subject = `${senderLabel} sent you a document`;
	const text = [
		`${senderLabel} sent you a secure document on Filosign.`,
		"",
		"Log in to view, sign, and download it:",
		documentUrl,
	].join("\n");

	const html = `
		<div style="font-family: Inter, Arial, sans-serif; color: #111827; line-height: 1.5; max-width: 560px;">
			<h1 style="font-size: 22px; margin: 0 0 12px;">You have a new document</h1>
			<p style="margin: 0 0 16px;">
				<strong>${escapedSenderLabel}</strong> sent you a secure document.
			</p>
			<div style="background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 12px; padding: 16px; margin: 0 0 20px;">
				<p style="margin: 0; color: #0c4a6e;">
					Log in to view, sign, and download your document.
				</p>
			</div>
			<a href="${documentUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 12px 20px; font-weight: 600;">
				View Document
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
