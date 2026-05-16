import { FILE_ACK_COLD_CLAIM_SENTINEL_V1 } from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import { and, eq, gt } from "drizzle-orm";
import { Hono } from "hono";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { authenticated } from "@/api/middleware/auth";
import db from "@/lib/db";
import { bucket } from "@/lib/s3/client";
import { respond } from "@/lib/utils/respond";
import {
	coldInviteExpiry,
	coldInviteSenderLabel,
	primaryEmailForWallet,
} from "./helpers";

const {
	files,
	fileColdInvites,
	fileParticipants,
	fileAcknowledgements,
	users,
} = db.schema;

export default new Hono()
	.get("/invite/by-token/:inviteToken", async (ctx) => {
		const inviteToken = ctx.req.param("inviteToken");
		if (!inviteToken || inviteToken.length < 8) {
			return respond.err(ctx, "Invalid invite", 400);
		}

		const rows = await db
			.select({
				inviteToken: fileColdInvites.inviteToken,
				email: fileColdInvites.email,
				wrappedEncryptionKey: fileColdInvites.wrappedEncryptionKey,
				expiresAt: fileColdInvites.expiresAt,
				isSigner: fileColdInvites.isSigner,
				pieceCid: files.pieceCid,
				sender: files.sender,
				placementManifestJson: files.placementManifestJson,
			})
			.from(fileColdInvites)
			.innerJoin(files, eq(fileColdInvites.filePieceCid, files.pieceCid))
			.where(
				and(
					eq(fileColdInvites.inviteToken, inviteToken),
					gt(fileColdInvites.expiresAt, new Date()),
				),
			);

		if (rows.length === 0) {
			return respond.err(ctx, "Invite not found", 404);
		}
		const [row] = rows;
		if (!row) {
			return respond.err(ctx, "Invite not found", 404);
		}
		const recipientEmails = [...new Set(rows.map((r) => r.email))];

		const key = `uploads/${row.pieceCid}`;
		if (!bucket.exists(key)) {
			return respond.err(ctx, "File not found", 404);
		}

		const downloadUrl = bucket.presign(key, {
			method: "GET",
			expiresIn: 60 * 5,
		});

		const [senderProfile] = await db
			.select({
				email: users.email,
				firstName: users.firstName,
				lastName: users.lastName,
			})
			.from(users)
			.where(eq(users.walletAddress, getAddress(row.sender as Address)));

		const senderLabel = coldInviteSenderLabel({
			senderWallet: row.sender,
			email: senderProfile?.email ?? null,
			firstName: senderProfile?.firstName ?? null,
			lastName: senderProfile?.lastName ?? null,
		});

		return respond.ok(
			ctx,
			{
				pieceCid: row.pieceCid,
				recipientEmails,
				wrappedEncryptionKey: row.wrappedEncryptionKey,
				isSigner: row.isSigner,
				sender: row.sender,
				senderLabel,
				placementManifest: row.placementManifestJson,
				expiresAt: row.expiresAt?.toISOString() ?? null,
				downloadUrl,
			},
			"Invite resolved",
			200,
		);
	})
	.post("/invite/claim/:inviteToken", authenticated, async (ctx) => {
		const userWallet = getAddress(ctx.var.userWallet);
		const inviteToken = ctx.req.param("inviteToken");
		const parsedBody = z
			.object({
				kemCiphertext: zHexString(),
				encryptedEncryptionKey: zHexString(),
			})
			.safeParse(await ctx.req.json());
		if (parsedBody.error) {
			return respond.err(ctx, parsedBody.error.message, 400);
		}
		if (!inviteToken || inviteToken.length < 8) {
			return respond.err(ctx, "Invalid invite", 400);
		}
		const profileEmail = await primaryEmailForWallet(userWallet);
		if (!profileEmail) {
			return respond.err(
				ctx,
				"Add a primary email to your profile before claiming this invite",
				400,
			);
		}

		const [invite] = await db
			.select({
				filePieceCid: fileColdInvites.filePieceCid,
				email: fileColdInvites.email,
				isSigner: fileColdInvites.isSigner,
			})
			.from(fileColdInvites)
			.where(
				and(
					eq(fileColdInvites.inviteToken, inviteToken),
					gt(fileColdInvites.expiresAt, new Date()),
					eq(fileColdInvites.email, profileEmail),
				),
			);
		if (!invite) {
			return respond.err(ctx, "Invite not found for this account email", 404);
		}

		const now = new Date();
		await db
			.insert(fileParticipants)
			.values({
				filePieceCid: invite.filePieceCid,
				wallet: userWallet,
				role: invite.isSigner ? "signer" : "viewer",
				kemCiphertext: parsedBody.data.kemCiphertext,
				encryptedEncryptionKey: parsedBody.data.encryptedEncryptionKey,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoUpdate({
				target: [fileParticipants.filePieceCid, fileParticipants.wallet],
				set: {
					role: invite.isSigner ? "signer" : "viewer",
					kemCiphertext: parsedBody.data.kemCiphertext,
					encryptedEncryptionKey: parsedBody.data.encryptedEncryptionKey,
					updatedAt: now,
				},
			});

		await db
			.delete(fileColdInvites)
			.where(
				and(
					eq(fileColdInvites.inviteToken, inviteToken),
					eq(fileColdInvites.email, profileEmail),
				),
			);

		await db
			.insert(fileAcknowledgements)
			.values({
				filePieceCid: invite.filePieceCid,
				wallet: userWallet,
				ack: FILE_ACK_COLD_CLAIM_SENTINEL_V1,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoNothing();

		return respond.ok(
			ctx,
			{
				filePieceCid: invite.filePieceCid,
				role: invite.isSigner ? "signer" : "viewer",
			},
			"Invite claimed",
			200,
		);
	})
	.post("/:pieceCid/cold-invite/regenerate", authenticated, async (ctx) => {
		const pieceCid = ctx.req.param("pieceCid");
		const senderWallet = getAddress(ctx.var.userWallet);
		const parsedBody = z
			.object({
				inviteToken: z.string().min(16),
				wrappedEncryptionKey: zHexString(),
			})
			.safeParse(await ctx.req.json());
		if (!pieceCid || pieceCid.length < 8 || parsedBody.error) {
			return respond.err(ctx, "Invalid request", 400);
		}

		const [file] = await db
			.select({
				sender: files.sender,
			})
			.from(files)
			.where(eq(files.pieceCid, pieceCid))
			.limit(1);
		if (
			!file ||
			getAddress(file.sender as Address) !== getAddress(senderWallet)
		) {
			return respond.err(ctx, "Forbidden", 403);
		}

		const activeInvites = await db
			.select({
				email: fileColdInvites.email,
			})
			.from(fileColdInvites)
			.where(
				and(
					eq(fileColdInvites.filePieceCid, pieceCid),
					gt(fileColdInvites.expiresAt, new Date()),
				),
			);
		if (activeInvites.length === 0) {
			return respond.err(ctx, "No active cold invites found", 404);
		}

		const expiresAt = coldInviteExpiry();
		await db
			.update(fileColdInvites)
			.set({
				inviteToken: parsedBody.data.inviteToken,
				wrappedEncryptionKey: parsedBody.data.wrappedEncryptionKey,
				expiresAt,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(fileColdInvites.filePieceCid, pieceCid),
					gt(fileColdInvites.expiresAt, new Date()),
				),
			);

		return respond.ok(
			ctx,
			{
				inviteToken: parsedBody.data.inviteToken,
				recipientEmails: activeInvites.map((row) => row.email),
				expiresAt: expiresAt.toISOString(),
			},
			"Cold invite regenerated",
			200,
		);
	});
