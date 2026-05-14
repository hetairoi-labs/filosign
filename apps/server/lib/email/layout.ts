import { escapeHtml } from "./html";

/**
 * Tokens aligned with apps/astro/src/styles/global.css (light theme).
 * Inline-only for email client compatibility.
 */
const COL = {
	bgPage: "hsl(90, 55%, 98%)",
	bgCard: "hsl(0, 0%, 100%)",
	foreground: "hsl(210, 6%, 13%)",
	muted: "hsl(0, 1%, 44%)",
	border: "hsl(240, 11%, 85%)",
	primary: "#202223",
	primaryFg: "hsl(60, 100%, 99%)",
	noteBg: "hsl(240, 11%, 96%)",
} as const;

/** Muted body text color for inline `style` fragments outside the main template. */
export const EMAIL_MUTED_COLOR = COL.muted;

export type TransactionalEmailContent = {
	/** Plain-language title (escaped in template). */
	title: string;
	/** Hidden preheader; keep short so it does not leak into the body on some clients. */
	preheader?: string;
	/** Safe HTML only; escape all user-controlled strings before interpolating. */
	bodyHtml: string;
	ctaHref: string;
	ctaLabel: string;
	/** Optional extra HTML below the button (already safe). */
	afterCtaHtml?: string;
};

/**
 * Table-based transactional HTML email (Gmail-friendly structure).
 */
export function buildTransactionalEmailHtml(
	content: TransactionalEmailContent,
): string {
	const titleEsc = escapeHtml(content.title);
	const preheaderEsc = content.preheader
		? escapeHtml(content.preheader)
		: titleEsc;
	const ctaLabelEsc = escapeHtml(content.ctaLabel);
	// href is server-built URLs only
	const ctaHref = content.ctaHref;

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${titleEsc}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600&family=Manrope:wght@400;500&display=swap" rel="stylesheet" />
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${COL.bgPage};">
<span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheaderEsc}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${COL.bgPage};padding:24px 12px;">
<tr>
<td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:${COL.bgCard};border:1px solid ${COL.border};border-radius:8px;">
<tr>
<td style="padding:28px 28px 8px;font-family:'Manrope',Manrope,'Manrope Variable',system-ui,sans-serif;font-size:15px;line-height:1.55;color:${COL.foreground};">
<p style="margin:0 0 20px;font-family:'Inter',Inter,system-ui,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.02em;color:${COL.muted};">Filosign</p>
<h1 style="margin:0 0 16px;font-family:'Inter',Inter,system-ui,sans-serif;font-size:20px;font-weight:600;line-height:1.3;color:${COL.foreground};">${titleEsc}</h1>
${content.bodyHtml}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 12px;">
<tr>
<td style="border-radius:8px;background-color:${COL.primary};">
<a href="${ctaHref}" style="display:inline-block;padding:12px 20px;font-family:'Inter',Inter,system-ui,sans-serif;font-size:14px;font-weight:600;color:${COL.primaryFg};text-decoration:none;border-radius:8px;">${ctaLabelEsc}</a>
</td>
</tr>
</table>
${content.afterCtaHtml ?? ""}
<p style="margin:20px 0 0;font-size:12px;line-height:1.45;color:${COL.muted};word-break:break-all;">If the button does not work, copy this link into your browser:<br />${escapeHtml(ctaHref)}</p>
</td>
</tr>
<tr>
<td style="padding:0 28px 24px;font-family:'Manrope',Manrope,system-ui,sans-serif;font-size:12px;line-height:1.45;color:${COL.muted};border-top:1px solid ${COL.border};">
<p style="margin:16px 0 0;">This message was sent by Filosign because someone used your email address in the product. If you did not expect it, you can ignore this email.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

/** Neutral note box (transactional, not promotional). */
export function emailNoteBoxHtml(innerHtml: string): string {
	return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px;background-color:${COL.noteBg};border:1px solid ${COL.border};border-radius:8px;">
<tr>
<td style="padding:14px 16px;font-family:'Manrope',Manrope,system-ui,sans-serif;font-size:14px;line-height:1.5;color:${COL.foreground};">${innerHtml}</td>
</tr>
</table>`;
}

/** Optional message from sender (user text already escaped; wrap in curly quotes in HTML). */
export function emailQuotedMessageHtml(escapedMessage: string): string {
	const open = "\u201c";
	const close = "\u201d";
	return `<p style="margin:0 0 16px;padding:12px 16px;border-left:3px solid ${COL.primary};background-color:${COL.noteBg};font-style:italic;color:${COL.muted};">${open}${escapedMessage}${close}</p>`;
}
