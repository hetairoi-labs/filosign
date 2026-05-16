import {
	buildRegistrationEmailCommitments,
	computePlacementCommitment,
	hashNormalizedSignerEmail,
	hashPrivySubjectCommitment,
	normalizePlacementRecipientEmail,
	zPlacementManifest,
} from "@filosign/shared";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { authenticated } from "@/api/middleware/auth";
import { MAX_FILE_SIZE } from "@/constants";
import db from "@/lib/db";
import {
	sendColdDocumentInviteEmail,
	sendDocumentReceivedEmail,
} from "@/lib/email/invites";
import { fsContracts } from "@/lib/evm";
import { bucket } from "@/lib/s3/client";
import { getOrCreateUserDataset } from "@/lib/synapse";
import { respond } from "@/lib/utils/respond";
import { tryCatch } from "@/lib/utils/tryCatch";
import { coldInviteExpiry, normalizedViewerEmailsForRegister } from "./helpers";

const { FSFileRegistry } = fsContracts;

const { files, fileParticipants, fileColdInvites, users } = db.schema;

export default new Hono().post("/", authenticated, async (ctx) => {
	const sender = ctx.var.userWallet;
	const rawBody = await ctx.req.json();
	const parsedBody = z
		.object({
			pieceCid: z.string({ error: "pieceCid invalid" }),
			participants: z.array(
				z.object({
					address: zEvmAddress(),
					kemCiphertext: zHexString(),
					encryptedEncryptionKey: zHexString(),
					isSigner: z
						.boolean({
							error: "participants[n].isSigner must be boolean",
						})
						.optional(),
				}),
			),
			signature: zHexString(),
			senderEncryptedEncryptionKey: zHexString(),
			senderKemCiphertext: zHexString(),
			timestamp: z.number({ error: "timestamp must be a number" }),
			placementCommitment: zHexString(),
			placementManifest: z.unknown(),
			coldInvites: z
				.array(
					z.object({
						email: z.email(),
						inviteToken: z.string().min(16),
						wrappedEncryptionKey: zHexString(),
						isSigner: z.boolean(),
					}),
				)
				.optional(),
		})
		.safeParse(rawBody);

	if (parsedBody.error) {
		return respond.err(ctx, parsedBody.error.message, 400);
	}
	const {
		pieceCid,
		participants,
		signature,
		senderEncryptedEncryptionKey,
		senderKemCiphertext,
		timestamp,
		placementCommitment,
		placementManifest: placementManifestRaw,
		coldInvites = [],
	} = parsedBody.data;

	const parsedManifest = zPlacementManifest.safeParse(placementManifestRaw);
	if (!parsedManifest.success) {
		return respond.err(ctx, "Invalid placement manifest", 400);
	}
	const placementManifest = parsedManifest.data;
	const derivedCommitment = computePlacementCommitment(placementManifest);
	if (derivedCommitment.toLowerCase() !== placementCommitment.toLowerCase()) {
		return respond.err(ctx, "placementCommitment does not match manifest", 400);
	}
	const viewerEmails = await normalizedViewerEmailsForRegister({
		participants,
		coldInvites,
	});
	const { signerEmailCommitmentsSorted, viewerEmailCommitmentsSorted } =
		buildRegistrationEmailCommitments({
			placementManifest,
			viewerEmails,
		});

	const [senderUser] = await db
		.select({
			email: users.email,
			privyDid: users.privyDid,
		})
		.from(users)
		.where(eq(users.walletAddress, getAddress(sender)));

	if (!senderUser) {
		return respond.err(ctx, "User not found", 404);
	}

	const senderEmailRaw = senderUser.email?.trim();
	if (!senderEmailRaw) {
		return respond.err(
			ctx,
			"Add a primary email to your profile before sending documents",
			400,
		);
	}
	const senderEmailCommitment = hashNormalizedSignerEmail(
		normalizePlacementRecipientEmail(senderEmailRaw),
	);
	const senderPrivySubjectCommitment = hashPrivySubjectCommitment(
		senderUser.privyDid,
	);

	const valid = await tryCatch(
		FSFileRegistry.read.validateFileRegistrationSignature([
			pieceCid,
			sender,
			signerEmailCommitmentsSorted,
			viewerEmailCommitmentsSorted,
			senderEmailCommitment,
			senderPrivySubjectCommitment,
			BigInt(timestamp),
			signature,
			placementCommitment,
		]),
	);

	if (valid.error) {
		return respond.err(ctx, `Error validating signature ${valid.error}`, 500);
	}
	if (!valid.data) {
		return respond.err(ctx, "Invalid signature", 400);
	}

	const fileExists = bucket.exists(`uploads/${pieceCid}`);
	if (!fileExists) {
		return respond.err(ctx, "File not found on storage", 400);
	}

	const file = bucket.file(`uploads/${pieceCid}`);
	if (file.size > MAX_FILE_SIZE) {
		file.delete();
		return respond.err(ctx, "File exceeds maximum allowed size", 413);
	}

	const bytes = await file.arrayBuffer();
	if (bytes.byteLength === 0) {
		file.delete();
		return respond.err(ctx, "Uploaded file is empty", 400);
	}

	const txHash = await FSFileRegistry.write.registerFile([
		pieceCid,
		sender,
		signerEmailCommitmentsSorted,
		viewerEmailCommitmentsSorted,
		senderEmailCommitment,
		senderPrivySubjectCommitment,
		BigInt(timestamp),
		signature,
		placementCommitment,
	]);

	const ds = await getOrCreateUserDataset(sender);

	await db.transaction(async (tx) => {
		const [insertResult] = await tx
			.insert(files)
			.values({
				pieceCid,
				// For now, treat all documents as "on FOC" (mock),
				// while keeping S3 as the source of truth for retrieval.
				status: "foc",
				sender,
				onchainTxHash: txHash,
				placementCommitment,
				placementManifestJson: placementManifest,
				createdAt: new Date(timestamp * 1000),
			})
			.returning();
		// TODO : Chcek using db if valid recipient
		await tx.insert(fileParticipants).values([
			{
				filePieceCid: pieceCid,
				wallet: getAddress(sender),
				role: "sender",
				kemCiphertext: senderKemCiphertext,
				encryptedEncryptionKey: senderEncryptedEncryptionKey,
			},
			...participants.map((p) => ({
				filePieceCid: pieceCid,
				wallet: getAddress(p.address),
				role: p.isSigner ? ("signer" as const) : ("viewer" as const),
				kemCiphertext: p.kemCiphertext,
				encryptedEncryptionKey: p.encryptedEncryptionKey,
			})),
		]);

		if (coldInvites.length > 0) {
			await tx.insert(fileColdInvites).values(
				coldInvites.map((c) => ({
					filePieceCid: pieceCid,
					email: c.email.trim().toLowerCase(),
					inviteToken: c.inviteToken,
					wrappedEncryptionKey: c.wrappedEncryptionKey,
					isSigner: c.isSigner,
					expiresAt: coldInviteExpiry(),
				})),
			);
		}

		return insertResult;
	});

	const participantWallets = [
		...new Set(participants.map((p) => getAddress(p.address))),
	];
	const participantProfiles = participantWallets.length
		? await db
				.select({
					walletAddress: users.walletAddress,
					email: users.email,
				})
				.from(users)
				.where(inArray(users.walletAddress, participantWallets))
		: [];
	const [senderProfile] = await db
		.select({
			email: users.email,
			firstName: users.firstName,
			lastName: users.lastName,
			username: users.username,
		})
		.from(users)
		.where(eq(users.walletAddress, sender));
	const senderName =
		[senderProfile?.firstName, senderProfile?.lastName]
			.filter(Boolean)
			.join(" ") ||
		senderProfile?.username ||
		senderProfile?.email ||
		undefined;

	const emailResults = await Promise.all(
		participantProfiles
			.filter((profile) => profile.email)
			.map((profile) =>
				tryCatch(
					sendDocumentReceivedEmail({
						to: profile.email as string,
						senderWallet: sender as Address,
						recipientWallet: profile.walletAddress as Address,
						pieceCid,
						senderName,
					}),
				),
			),
	);
	const emailFailures = emailResults.filter((result) => result.error);
	if (emailFailures.length > 0) {
		console.error("Failed to send document notification emails", {
			pieceCid,
			failedCount: emailFailures.length,
			errors: emailFailures.map((result) => result.error?.message),
		});
	}

	const coldEmailResults = await Promise.all(
		coldInvites.map((c) =>
			tryCatch(
				sendColdDocumentInviteEmail({
					to: c.email.trim().toLowerCase(),
					pieceCid,
					inviteToken: c.inviteToken,
					senderWallet: sender as Address,
					senderName,
				}),
			),
		),
	);
	const coldEmailFailures = coldEmailResults.filter((r) => r.error);
	if (coldEmailFailures.length > 0) {
		console.error("Failed to send cold invite emails", {
			pieceCid,
			failedCount: coldEmailFailures.length,
			errors: coldEmailFailures.map((r) => r.error?.message),
		});
	}

	ds.upload(new Uint8Array(bytes), { pieceMetadata: {} })
		.then(async (uploadResult) => {
			if (uploadResult.pieceCid.toString() !== pieceCid) {
				await db.delete(files).where(eq(files.pieceCid, pieceCid));
			}
		})
		.catch((err) => {
			console.warn(
				"Filecoin addPieces failed (file remains in S3):",
				err?.message ?? err,
			);
			console.warn("[files.upload] synapse upload failed", {
				pieceCid,
				sender,
				error: err?.message ?? String(err),
			});
		});

	return respond.ok(ctx, {}, "File uploaded to filecoin warmstorage", 201);
});
