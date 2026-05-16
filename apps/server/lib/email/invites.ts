import { createHash } from "node:crypto";
import { Resend } from "resend";
import type { Address } from "viem";
import env from "@/env";
import { escapeHtml } from "./html";
import {
	buildTransactionalEmailHtml,
	EMAIL_MUTED_COLOR,
	emailNoteBoxHtml,
	emailQuotedMessageHtml,
} from "./layout";
import { getPublicAppUrl } from "./public-url";

/**
 * All outbound product email is sent through this file (Resend). There are no
 * other `resend.emails.send` call sites in `apps/server` or packages.
 */
function shouldSkipEmail(): boolean {
	if (env.DEBUG) {
		console.log("[DEBUG] Skipping email send (DEBUG mode is enabled)");
		return true;
	}
	return false;
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

function idempotencyKey(parts: string[]): string {
	// Resend caps idempotency keys at 256 chars (see Send Email API docs)
	return createHash("sha256")
		.update(parts.join("\0"))
		.digest("hex")
		.slice(0, 240);
}

async function deliverEmail(args: {
	to: string;
	subject: string;
	text: string;
	html: string;
	idempotencySegments: string[];
}) {
	const { data, error } = await resend.emails.send(
		{
			from: env.RESEND_FROM_EMAIL,
			to: args.to,
			subject: args.subject,
			text: args.text,
			html: args.html,
			replyTo: env.RESEND_FROM_EMAIL,
		},
		{
			headers: {
				"Idempotency-Key": idempotencyKey(args.idempotencySegments),
			},
		},
	);
	if (error) {
		throw new Error(error.message);
	}
	if (data?.id) {
		console.info("[email] resend sent", { id: data.id, to: args.to });
	}
}

export async function sendShareRequestEmail(args: SendShareRequestEmailArgs) {
	if (shouldSkipEmail()) return;

	const appUrl = getPublicAppUrl();
	const requestUrl = `${appUrl}/dashboard/connections`;
	const senderLabel =
		args.senderName?.trim() || formatAddress(args.senderWallet);
	const escapedSenderLabel = escapeHtml(senderLabel);
	const escapedMessage = args.message?.trim()
		? escapeHtml(args.message.trim())
		: null;

	const subject = `${senderLabel} requested to connect on Filosign`;
	const text = [
		`${senderLabel} sent a connection request on Filosign.`,
		"",
		...(args.message?.trim() ? [`"${args.message.trim()}"`, ""] : []),
		"Sign in and open Connections to approve or decline:",
		requestUrl,
	].join("\n");

	const bodyParts: string[] = [];
	if (escapedMessage) {
		bodyParts.push(emailQuotedMessageHtml(escapedMessage));
	}
	bodyParts.push(
		`<p style="margin:0 0 16px;">${escapedSenderLabel} requested a connection so they can send you documents. Sign in with this email address, open <strong>Connections</strong>, then approve or decline the pending request.</p>`,
	);
	bodyParts.push(
		emailNoteBoxHtml(
			`<p style="margin:0;font-size:14px;">If you do not recognize this sender, decline the request or contact support from the app.</p>`,
		),
	);

	const html = buildTransactionalEmailHtml({
		title: `${senderLabel} requested to connect`,
		preheader: `${senderLabel} sent a connection request. Open Connections to respond.`,
		bodyHtml: bodyParts.join(""),
		ctaHref: requestUrl,
		ctaLabel: "Open Connections",
	});

	await deliverEmail({
		to: args.to,
		subject,
		text,
		html,
		idempotencySegments: [
			"share-request",
			args.to.trim().toLowerCase(),
			args.senderWallet.toLowerCase(),
			args.recipientWallet.toLowerCase(),
			subject,
		],
	});
}

type SendColdDocumentInviteEmailArgs = {
	to: string;
	pieceCid: string;
	inviteToken: string;
	senderWallet: Address;
	senderName?: string | null;
};

export async function sendColdDocumentInviteEmail(
	args: SendColdDocumentInviteEmailArgs,
) {
	if (shouldSkipEmail()) return;

	const appUrl = getPublicAppUrl();
	const signUrl = new URL("/", appUrl);
	signUrl.searchParams.set("coldPieceCid", args.pieceCid);
	signUrl.searchParams.set("coldInvite", args.inviteToken);
	const senderLabel =
		args.senderName?.trim() || formatAddress(args.senderWallet);
	const escapedSenderLabel = escapeHtml(senderLabel);
	const signHref = signUrl.toString();

	const subject = `${senderLabel} sent you a document`;
	const text = [
		`${senderLabel} shared a document with you on Filosign.`,
		"",
		"Open the link to view or sign. They should give you a six-word passphrase separately (not in this email):",
		signHref,
	].join("\n");

	const bodyHtml = [
		`<p style="margin:0 0 12px;"><strong>${escapedSenderLabel}</strong> shared a document that needs your attention.</p>`,
		`<p style="margin:0 0 16px;color:${EMAIL_MUTED_COLOR};">After you open the link, enter the six-word passphrase they send you through another channel (for example a message or call).</p>`,
	].join("");

	const html = buildTransactionalEmailHtml({
		title: "Document shared with you",
		preheader: `${senderLabel} shared a document. Open the link, then enter their passphrase.`,
		bodyHtml,
		ctaHref: signHref,
		ctaLabel: "Open document",
	});

	await deliverEmail({
		to: args.to,
		subject,
		text,
		html,
		idempotencySegments: [
			"cold-doc-invite",
			args.to.trim().toLowerCase(),
			args.pieceCid,
			args.inviteToken,
			args.senderWallet.toLowerCase(),
		],
	});
}

export async function sendInviteEmail(args: SendInviteEmailArgs) {
	if (shouldSkipEmail()) return;

	const appUrl = getPublicAppUrl();
	const inviteUrl = `${appUrl}/invite/${args.inviteId}`;
	const senderLabel =
		args.senderName?.trim() || formatAddress(args.senderWallet);
	const escapedSenderLabel = escapeHtml(senderLabel);
	const escapedMessage = args.message?.trim()
		? escapeHtml(args.message.trim())
		: null;

	const subject = `${senderLabel} invited you on Filosign`;
	const text = [
		`${senderLabel} invited you to join Filosign so they can share documents with you.`,
		"",
		...(args.message?.trim() ? [`"${args.message.trim()}"`, ""] : []),
		"What to do:",
		"1. Open the link below",
		"2. Create your account",
		"3. Accept their connection request when asked",
		"",
		inviteUrl,
	].join("\n");

	const bodyParts: string[] = [];
	if (escapedMessage) {
		bodyParts.push(emailQuotedMessageHtml(escapedMessage));
	}
	bodyParts.push(
		`<p style="margin:0 0 16px;">${escapedSenderLabel} invited you to Filosign. Use the link below with this email address, finish sign-up, then accept the connection request so they can send you documents.</p>`,
	);
	bodyParts.push(
		emailNoteBoxHtml(
			`<p style="margin:0 0 8px;font-size:14px;font-weight:600;">Steps</p>
			<ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.6;">
			<li style="margin-bottom:6px;">Open the invitation link.</li>
			<li style="margin-bottom:6px;">Create your account.</li>
			<li>Accept the connection request from this sender.</li>
			</ol>`,
		),
	);

	const html = buildTransactionalEmailHtml({
		title: `${senderLabel} invited you`,
		preheader: `${senderLabel} invited you to Filosign. Open the link to finish sign-up.`,
		bodyHtml: bodyParts.join(""),
		ctaHref: inviteUrl,
		ctaLabel: "Open invitation",
	});

	await deliverEmail({
		to: args.to,
		subject,
		text,
		html,
		idempotencySegments: [
			"user-invite",
			args.inviteId,
			args.to.trim().toLowerCase(),
			args.senderWallet.toLowerCase(),
		],
	});
}

export async function sendDocumentReceivedEmail(
	args: SendDocumentReceivedEmailArgs,
) {
	if (shouldSkipEmail()) return;

	const appUrl = getPublicAppUrl();
	const documentUrl = `${appUrl}/dashboard/document/sign?pieceCid=${encodeURIComponent(args.pieceCid)}`;
	const senderLabel =
		args.senderName?.trim() || formatAddress(args.senderWallet);
	const escapedSenderLabel = escapeHtml(senderLabel);

	const subject = `${senderLabel} sent you a document`;
	const text = [
		`${senderLabel} sent you a document on Filosign.`,
		"",
		"Sign in to view, sign, or download:",
		documentUrl,
	].join("\n");

	const bodyHtml = `<p style="margin:0 0 16px;"><strong>${escapedSenderLabel}</strong> sent you a document. Sign in with the account that uses this email address to open it.</p>`;

	const html = buildTransactionalEmailHtml({
		title: "New document",
		preheader: `${senderLabel} sent a document. Sign in to open it.`,
		bodyHtml,
		ctaHref: documentUrl,
		ctaLabel: "Open document",
	});

	await deliverEmail({
		to: args.to,
		subject,
		text,
		html,
		idempotencySegments: [
			"doc-received",
			args.to.trim().toLowerCase(),
			args.pieceCid,
			args.senderWallet.toLowerCase(),
		],
	});
}
