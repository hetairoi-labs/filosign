import {
	computeCommitment,
	jsonStringify,
	signatures,
	toBytes,
} from "@filosign/crypto-utils/node";
import {
	completionsMerkleRootV1,
	computePlacementCommitment,
	LEAF_SCHEMA_VERSION_V1,
	requiredFieldIdsForSigner,
	zPlacementManifest,
} from "@filosign/shared";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { authenticated } from "@/api/middleware/auth";
import {
	buildComplianceBundleAndHash,
	insertComplianceExportLog,
} from "@/lib/compliance/buildComplianceBundle";
import db from "@/lib/db";
import { sendDocumentReceivedEmail } from "@/lib/email/invites";
import { evmClient, fsContracts } from "@/lib/evm";
import { bucket } from "@/lib/s3/client";
import { getOrCreateUserDataset } from "@/lib/synapse";
import { respond } from "@/lib/utils/respond";
import { tryCatch } from "@/lib/utils/tryCatch";

const { FSFileRegistry, FSManager } = fsContracts;

const MAX_FILE_SIZE = 30 * 1024 * 1024;

const {
	files,
	fileAcknowledgements,
	fileParticipants,
	fileSignatures,
	fileSignerDrafts,
	shareApprovals,
	users,
} = db.schema;

function isSenderAlreadyApprovedError(err: unknown): boolean {
	const msg = err instanceof Error ? err.message : String(err);
	return msg.includes("SenderAlreadyApproved");
}

export default new Hono()
	.post("/upload/start", authenticated, async (ctx) => {
		const { pieceCid } = await ctx.req.json();

		if (!pieceCid || typeof pieceCid !== "string") {
			return respond.err(ctx, "Invalid pieceCid", 400);
		}

		const key = `uploads/${pieceCid}`;

		const presignedUrl = bucket.presign(key, {
			method: "PUT",
			expiresIn: 60,
			type: "application/octet-stream",
			acl: "public-read",
		});

		return respond.ok(
			ctx,
			{ uploadUrl: presignedUrl, key },
			"Presigned URL generated",
			200,
		);
	})

	.post("/", authenticated, async (ctx) => {
		const sender = ctx.var.userWallet;
		const rawBody = await ctx.req.json();
		const parsedBody = z
			.object({
				pieceCid: z.string("pieceCid invalid"),
				participants: z.array(
					z.object({
						address: zEvmAddress(),
						kemCiphertext: zHexString(),
						encryptedEncryptionKey: zHexString(),
						isSigner: z
							.boolean("participants[n].isSigner must be boolean")
							.optional(),
					}),
				),
				signature: zHexString(),
				senderEncryptedEncryptionKey: zHexString(),
				senderKemCiphertext: zHexString(),
				timestamp: z.number("timestamp must be a number"),
				placementCommitment: zHexString(),
				placementManifest: z.unknown(),
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
		} = parsedBody.data;

		const parsedManifest = zPlacementManifest.safeParse(placementManifestRaw);
		if (!parsedManifest.success) {
			return respond.err(ctx, "Invalid placement manifest", 400);
		}
		const placementManifest = parsedManifest.data;
		const derivedCommitment = computePlacementCommitment(placementManifest);
		if (derivedCommitment.toLowerCase() !== placementCommitment.toLowerCase()) {
			return respond.err(
				ctx,
				"placementCommitment does not match manifest",
				400,
			);
		}
		const signers = participants
			.filter((p) => p.isSigner)
			.map((p) => getAddress(p.address))
			.sort();

		const valid = await tryCatch(
			FSFileRegistry.read.validateFileRegistrationSignature([
				pieceCid,
				sender,
				signers,
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
			signers,
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
	})

	.get("/sent", authenticated, async (ctx) => {
		const userWallet = ctx.var.userWallet;

		const sentFiles = await db
			.select({
				pieceCid: files.pieceCid,
				sender: files.sender,
				// Hard-code for now so UI can mock "FOC" status.
				status: sql<"foc">`'foc'`.as("status"),
			})
			.from(files)
			.where(eq(files.sender, userWallet));

		return respond.ok(ctx, { files: sentFiles }, "Sent files retrieved", 200);
	})

	.get("/received", authenticated, async (ctx) => {
		const userWallet = ctx.var.userWallet;

		const receivedFiles = await db
			.select({
				pieceCid: files.pieceCid,
				sender: files.sender,
				// Hard-code for now so UI can mock "FOC" status.
				status: sql<"foc">`'foc'`.as("status"),
				encryptedEncryptionKey: fileParticipants.encryptedEncryptionKey,
				kemCiphertext: fileParticipants.kemCiphertext,
			})
			.from(files)
			.innerJoin(
				fileParticipants,
				eq(files.pieceCid, fileParticipants.filePieceCid),
			)
			.where(
				and(
					eq(fileParticipants.wallet, userWallet),
					ne(files.sender, userWallet),
				),
			);

		const approvalRows = await db
			.select({
				senderWallet: shareApprovals.senderWallet,
				active: shareApprovals.active,
			})
			.from(shareApprovals)
			.where(eq(shareApprovals.recipientWallet, userWallet))
			.orderBy(desc(shareApprovals.createdAt));

		const latestApprovalBySender = new Map<string, boolean>();
		for (const row of approvalRows) {
			const sender = getAddress(row.senderWallet).toLowerCase();
			if (!latestApprovalBySender.has(sender)) {
				latestApprovalBySender.set(sender, row.active);
			}
		}

		type ReceivedInboxEntry = (typeof receivedFiles)[number] & {
			inboxCategory: "primary" | "pending";
		};
		const primary: ReceivedInboxEntry[] = [];
		const pending: ReceivedInboxEntry[] = [];
		for (const file of receivedFiles) {
			const sender = getAddress(file.sender).toLowerCase();
			const isApproved = latestApprovalBySender.get(sender) === true;
			const entry = {
				...file,
				inboxCategory: isApproved ? ("primary" as const) : ("pending" as const),
			};
			if (isApproved) {
				primary.push(entry);
			} else {
				pending.push(entry);
			}
		}
		const categorizedFiles: ReceivedInboxEntry[] = [...primary, ...pending];

		return respond.ok(
			ctx,
			{ files: categorizedFiles, primary, pending },
			"Received files retrieved",
			200,
		);
	})

	.get("/:pieceCid/compliance-bundle", authenticated, async (ctx) => {
		const userWallet = ctx.var.userWallet;
		const pieceCid = ctx.req.param("pieceCid");
		const documentSha256 = ctx.req.query("documentSha256")?.trim() || undefined;

		const participants = await db
			.select({
				wallet: fileParticipants.wallet,
				role: fileParticipants.role,
				firstName: users.firstName,
				lastName: users.lastName,
				email: users.email,
				username: users.username,
			})
			.from(fileParticipants)
			.leftJoin(users, eq(fileParticipants.wallet, users.walletAddress))
			.where(eq(fileParticipants.filePieceCid, pieceCid));

		const [fileRecord] = await db
			.select({ pieceCid: files.pieceCid, sender: files.sender })
			.from(files)
			.where(eq(files.pieceCid, pieceCid));

		if (!fileRecord) {
			return respond.err(ctx, "File not found", 404);
		}

		const userWalletNorm = getAddress(userWallet);
		const participantUser = participants.find(
			(p) => getAddress(p.wallet) === userWalletNorm,
		);
		if (!participantUser) {
			return respond.err(ctx, "You dont have access to this file", 403);
		}

		const participantRows = participants.map((p) => ({
			wallet: getAddress(p.wallet),
			role: p.role as "sender" | "viewer" | "signer",
			firstName: p.firstName,
			lastName: p.lastName,
			email: p.email,
			username: p.username,
		}));

		const bundleRes = await tryCatch(
			buildComplianceBundleAndHash({
				db,
				pieceCid,
				participantRows,
			}),
		);
		if (bundleRes.error) {
			return respond.err(
				ctx,
				bundleRes.error instanceof Error
					? bundleRes.error.message
					: "Compliance bundle failed",
				500,
			);
		}
		const bundleResult = bundleRes.data;

		const ua = ctx.req.header("user-agent") ?? null;
		const fwd = ctx.req.header("x-forwarded-for");
		const requestIp = fwd?.split(",")[0]?.trim() ?? null;

		const logRes = await tryCatch(
			insertComplianceExportLog({
				db,
				pieceCid,
				requestedBy: userWalletNorm,
				bundle: bundleResult.bundle,
				bundleHash: bundleResult.bundleHash,
				documentSha256,
				requestUserAgent: ua,
				requestIp,
			}),
		);
		if (logRes.error) {
			return respond.err(ctx, "Failed to log compliance export", 500);
		}
		const logResult = logRes.data;

		return respond.ok(
			ctx,
			{
				exportId: logResult.exportId,
				bundleHash: bundleResult.bundleHash,
				bundle: bundleResult.bundle,
			},
			"Compliance bundle generated",
			200,
		);
	})

	.get("/:pieceCid", authenticated, async (ctx) => {
		const userWallet = ctx.var.userWallet;

		const pieceCid = ctx.req.param("pieceCid");

		const [fileRecord] = await db
			.select({
				pieceCid: files.pieceCid,
				sender: files.sender,
				// Hard-code for now so UI can mock "FOC" status.
				status: sql<"foc">`'foc'`.as("status"),
				onchainTxHash: files.onchainTxHash,
				createdAt: files.createdAt,
				placementCommitment: files.placementCommitment,
				placementManifestJson: files.placementManifestJson,
			})
			.from(files)
			.where(eq(files.pieceCid, pieceCid));

		const participants = await db
			.select({
				wallet: fileParticipants.wallet,
				role: fileParticipants.role,
				kemCiphertext: fileParticipants.kemCiphertext,
				encryptedEncryptionKey: fileParticipants.encryptedEncryptionKey,
				firstName: users.firstName,
				lastName: users.lastName,
				email: users.email,
				username: users.username,
			})
			.from(fileParticipants)
			.leftJoin(users, eq(fileParticipants.wallet, users.walletAddress))
			.where(eq(fileParticipants.filePieceCid, pieceCid));

		if (!fileRecord) {
			return respond.err(ctx, "File not found", 404);
		}
		const userWalletNorm = getAddress(userWallet);
		const participantUser = participants.find(
			(p) => getAddress(p.wallet) === userWalletNorm,
		);
		if (!participantUser) {
			return respond.err(ctx, "You dont have access to this file", 403);
		}

		const fileSignaturesRecord = await db
			.select({
				signer: fileSignatures.signer,
				timestamp: fileSignatures.createdAt,
				onchainTxHash: fileSignatures.onchainTxHash,
			})
			.from(fileSignatures)
			.where(eq(fileSignatures.filePieceCid, pieceCid));

		const signers = participants
			.filter((p) => p.role === "signer")
			.map((p) => ({
				wallet: getAddress(p.wallet),
				name:
					[p.firstName, p.lastName].filter(Boolean).join(" ") ||
					p.username ||
					null,
				email: p.email || null,
			}))
			.sort((a, b) => a.wallet.localeCompare(b.wallet));

		const viewers = participants
			.filter((p) => p.role === "viewer")
			.map((p) => ({
				wallet: getAddress(p.wallet),
				name:
					[p.firstName, p.lastName].filter(Boolean).join(" ") ||
					p.username ||
					null,
				email: p.email || null,
			}))
			.sort((a, b) => a.wallet.localeCompare(b.wallet));

		const [acked] = await db
			.select()
			.from(fileAcknowledgements)
			.where(
				and(
					eq(fileAcknowledgements.filePieceCid, pieceCid),
					eq(fileAcknowledgements.wallet, userWalletNorm),
				),
			);
		const canRead = !!acked || getAddress(fileRecord.sender) === userWalletNorm;

		const response = {
			pieceCid: fileRecord.pieceCid,
			sender: fileRecord.sender,
			status: fileRecord.status,
			onchainTxHash: fileRecord.onchainTxHash,
			createdAt: fileRecord.createdAt,
			placementCommitment: fileRecord.placementCommitment,
			placementManifest: fileRecord.placementManifestJson,
			signers,
			viewers,
			signatures: fileSignaturesRecord,

			kemCiphertext: canRead ? participantUser.kemCiphertext : null,
			encryptedEncryptionKey: canRead
				? participantUser.encryptedEncryptionKey
				: null,
		};

		return respond.ok(ctx, response, "File retrieved", 200);
	})

	.post("/:pieceCid/ack", authenticated, async (ctx) => {
		const userWallet = ctx.var.userWallet;
		const pieceCid = ctx.req.param("pieceCid");

		const rawBody = await ctx.req.json();
		const parsedBody = z
			.object({
				signature: zHexString(),
				timestamp: z.number("timestamp must be a number"),
			})
			.safeParse(rawBody);
		if (parsedBody.error) {
			return respond.err(ctx, parsedBody.error.message, 400);
		}
		const { signature, timestamp } = parsedBody.data;

		const [fileRecord] = await db
			.select({
				pieceCid: files.pieceCid,
				sender: files.sender,
			})
			.from(files)
			.where(eq(files.pieceCid, pieceCid));

		const [participantRecord] = await db
			.select({
				wallet: fileParticipants.wallet,
			})
			.from(fileParticipants)
			.where(
				and(
					eq(fileParticipants.filePieceCid, fileRecord.pieceCid),
					eq(fileParticipants.wallet, userWallet),
				),
			);
		if (!participantRecord) {
			return respond.err(ctx, "you are nto Participant in thies file", 404);
		}

		const [existingAck] = await db
			.select()
			.from(fileAcknowledgements)
			.where(
				and(
					eq(fileAcknowledgements.filePieceCid, pieceCid),
					eq(fileAcknowledgements.wallet, userWallet),
				),
			);
		if (existingAck) {
			return respond.err(ctx, "File already acked", 409);
		}

		const valid = await FSFileRegistry.read.validateFileAckSignature([
			pieceCid,
			fileRecord.sender,
			participantRecord.wallet,
			BigInt(timestamp),
			signature,
		]);

		if (valid) {
			await db.insert(fileAcknowledgements).values({
				filePieceCid: fileRecord.pieceCid,
				wallet: getAddress(participantRecord.wallet),
				ack: signature,
				createdAt: new Date(timestamp * 1000),
			});
			return respond.ok(ctx, {}, "File acknowledged successfully", 200);
		} else {
			return respond.err(ctx, "Invalid signature", 400);
		}
	})

	.get("/:pieceCid/sign-draft", authenticated, async (ctx) => {
		const userWallet = ctx.var.userWallet;
		const pieceCid = ctx.req.param("pieceCid");

		const [fileRecord] = await db
			.select({
				placementManifestJson: files.placementManifestJson,
			})
			.from(files)
			.where(eq(files.pieceCid, pieceCid));

		const [participantRecord] = await db
			.select({ wallet: fileParticipants.wallet })
			.from(fileParticipants)
			.where(
				and(
					eq(fileParticipants.filePieceCid, pieceCid),
					eq(fileParticipants.role, "signer"),
					eq(fileParticipants.wallet, userWallet),
				),
			);

		if (!fileRecord) {
			return respond.err(ctx, "File not found", 404);
		}
		if (!participantRecord) {
			return respond.err(ctx, "You are not required to sign this file", 403);
		}

		const manifestParsed = zPlacementManifest.safeParse(
			fileRecord.placementManifestJson,
		);
		if (!manifestParsed.success) {
			return respond.err(
				ctx,
				"File placement manifest missing or invalid",
				500,
			);
		}

		const signerAddr = getAddress(participantRecord.wallet);
		const allowedIds = new Set(
			manifestParsed.data.fields
				.filter((f) => getAddress(f.assignedSigner) === signerAddr)
				.map((f) => f.id),
		);

		const [draft] = await db
			.select({ completedFieldIds: fileSignerDrafts.completedFieldIds })
			.from(fileSignerDrafts)
			.where(
				and(
					eq(fileSignerDrafts.filePieceCid, pieceCid),
					eq(fileSignerDrafts.wallet, participantRecord.wallet),
				),
			);

		const stored = draft?.completedFieldIds ?? [];
		const completedFieldIds = stored.filter((id) => allowedIds.has(id));

		return respond.ok(ctx, { completedFieldIds }, "Sign draft retrieved", 200);
	})

	.put("/:pieceCid/sign-draft", authenticated, async (ctx) => {
		const userWallet = ctx.var.userWallet;
		const pieceCid = ctx.req.param("pieceCid");

		const rawBody = await ctx.req.json();
		const parsedBody = z
			.object({
				completedFieldIds: z.array(z.string()),
			})
			.safeParse(rawBody);
		if (parsedBody.error) {
			return respond.err(ctx, parsedBody.error.message, 400);
		}
		const { completedFieldIds: bodyIds } = parsedBody.data;

		const [fileRecord] = await db
			.select({
				placementManifestJson: files.placementManifestJson,
			})
			.from(files)
			.where(eq(files.pieceCid, pieceCid));

		const [participantRecord] = await db
			.select({ wallet: fileParticipants.wallet })
			.from(fileParticipants)
			.where(
				and(
					eq(fileParticipants.filePieceCid, pieceCid),
					eq(fileParticipants.role, "signer"),
					eq(fileParticipants.wallet, userWallet),
				),
			);

		if (!fileRecord) {
			return respond.err(ctx, "File not found", 404);
		}
		if (!participantRecord) {
			return respond.err(ctx, "You are not required to sign this file", 403);
		}

		const manifestParsed = zPlacementManifest.safeParse(
			fileRecord.placementManifestJson,
		);
		if (!manifestParsed.success) {
			return respond.err(
				ctx,
				"File placement manifest missing or invalid",
				500,
			);
		}

		const signerAddr = getAddress(participantRecord.wallet);
		const allowedIds = new Set(
			manifestParsed.data.fields
				.filter((f) => getAddress(f.assignedSigner) === signerAddr)
				.map((f) => f.id),
		);

		for (const id of bodyIds) {
			if (!allowedIds.has(id)) {
				return respond.err(
					ctx,
					"completedFieldIds must match manifest fields for signer",
					400,
				);
			}
		}

		const completedFieldIds = [...new Set(bodyIds)];
		const now = new Date();

		await db
			.insert(fileSignerDrafts)
			.values({
				filePieceCid: pieceCid,
				wallet: participantRecord.wallet,
				completedFieldIds,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoUpdate({
				target: [fileSignerDrafts.filePieceCid, fileSignerDrafts.wallet],
				set: {
					completedFieldIds,
					updatedAt: now,
				},
			});

		return respond.ok(ctx, { completedFieldIds }, "Sign draft saved", 200);
	})

	.post("/:pieceCid/sign", authenticated, async (ctx) => {
		const userWallet = ctx.var.userWallet;
		const pieceCid = ctx.req.param("pieceCid");
		const encoder = new TextEncoder();
		const dilithium = await signatures.dilithiumInstance();

		const rawBody = await ctx.req.json();

		const parsedBody = z
			.object({
				signature: zHexString(),
				timestamp: z.number("timestamp must be a number"),
				dl3Signature: zHexString(),
				completedFieldIds: z.array(z.string()).optional(),
				approveSender: z
					.object({
						nonce: z.coerce.bigint(),
						deadline: z.coerce.bigint(),
						signature: zHexString(),
					})
					.optional(),
			})
			.safeParse(rawBody);
		if (parsedBody.error) {
			return respond.err(ctx, parsedBody.error.message, 400);
		}
		const {
			signature,
			timestamp,
			dl3Signature,
			completedFieldIds,
			approveSender,
		} = parsedBody.data;

		const [fileRecord] = await db
			.select({
				pieceCid: files.pieceCid,
				sender: files.sender,
				placementCommitment: files.placementCommitment,
				placementManifestJson: files.placementManifestJson,
			})
			.from(files)
			.where(eq(files.pieceCid, pieceCid));

		const [participantRecord] = await db
			.select({
				wallet: fileParticipants.wallet,
			})
			.from(fileParticipants)
			.where(
				and(
					eq(fileParticipants.filePieceCid, pieceCid),
					eq(fileParticipants.role, "signer"),
					eq(fileParticipants.wallet, userWallet),
				),
			);

		if (!fileRecord) {
			return respond.err(ctx, "File not found", 404);
		}

		if (!participantRecord) {
			return respond.err(ctx, "You are not required to sign this file", 403);
		}

		const manifestParsed = zPlacementManifest.safeParse(
			fileRecord.placementManifestJson,
		);
		if (!manifestParsed.success) {
			return respond.err(
				ctx,
				"File placement manifest missing or invalid",
				500,
			);
		}

		const signerAddr = getAddress(participantRecord.wallet);
		const assignedForSigner = manifestParsed.data.fields.filter(
			(f) => getAddress(f.assignedSigner) === signerAddr,
		);
		const allowedIds = new Set(assignedForSigner.map((f) => f.id));

		const requiredIds = requiredFieldIdsForSigner(
			manifestParsed.data,
			signerAddr,
		);

		let fieldIds: string[];
		if (completedFieldIds !== undefined) {
			fieldIds = completedFieldIds;
			const completedSet = new Set(fieldIds);
			for (const id of fieldIds) {
				if (!allowedIds.has(id)) {
					return respond.err(
						ctx,
						"completedFieldIds must match manifest fields for signer",
						400,
					);
				}
			}
			for (const req of requiredIds) {
				if (!completedSet.has(req)) {
					return respond.err(
						ctx,
						"All required fields must be marked complete before signing",
						400,
					);
				}
			}
		} else {
			fieldIds = assignedForSigner.map((f) => f.id);
		}

		if (fieldIds.length === 0) {
			return respond.err(ctx, "No fields to complete for this signer", 400);
		}

		const completedFieldIdsStored = [...new Set(fieldIds)].sort((a, b) =>
			a.localeCompare(b),
		);

		let completionsRoot: `0x${string}`;
		try {
			completionsRoot = completionsMerkleRootV1({
				fieldIds: completedFieldIdsStored,
				placementCommitment: fileRecord.placementCommitment,
				pieceCid,
				signer: signerAddr,
			});
		} catch {
			return respond.err(ctx, "Could not compute completions root", 400);
		}

		const [{ signaturePublicKey: signerDl3PubKey }] = await db
			.select({
				signaturePublicKey: users.signaturePublicKey,
			})
			.from(users)
			.where(eq(users.walletAddress, participantRecord.wallet));

		const dl3SignatureMessage = jsonStringify({
			pieceCid,
			sender: fileRecord.sender,
			signer: participantRecord.wallet,
			timestamp,
			completionsRoot,
			leafSchemaVersion: LEAF_SCHEMA_VERSION_V1,
		});
		const dl3SignatureCommitment = computeCommitment([dl3Signature]);

		const isDl3SignatureValid = await signatures.verify({
			dl: dilithium,
			message: encoder.encode(dl3SignatureMessage),
			signature: toBytes(dl3Signature),
			publicKey: toBytes(signerDl3PubKey),
		});

		if (!isDl3SignatureValid) {
			return respond.err(ctx, "Invalid DL3 signature", 400);
		}

		const signerRows = await db
			.select({ wallet: fileParticipants.wallet })
			.from(fileParticipants)
			.where(
				and(
					eq(fileParticipants.filePieceCid, pieceCid),
					eq(fileParticipants.role, "signer"),
				),
			);
		const allSignersCalldata = signerRows
			.map((p) => getAddress(p.wallet))
			.sort();

		const registerSignatureArgs = [
			pieceCid,
			fileRecord.sender,
			participantRecord.wallet,
			dl3SignatureCommitment,
			BigInt(timestamp),
			signature,
			allSignersCalldata,
			completionsRoot,
			LEAF_SCHEMA_VERSION_V1,
		] as const;

		try {
			await FSFileRegistry.simulate.registerFileSignature(
				registerSignatureArgs,
				{
					// viem simulates via the public client; `account` sets `msg.sender` for `onlyServer`.
					account: evmClient.account,
				},
			);
		} catch (_err) {
			return respond.err(ctx, "Invalid signature", 400);
		}

		const txHash = await FSFileRegistry.write.registerFileSignature(
			registerSignatureArgs,
		);
		let approveSenderTxHash: string | null = null;
		if (approveSender) {
			const approveSenderArgs = [
				participantRecord.wallet,
				fileRecord.sender,
				approveSender.nonce,
				approveSender.deadline,
				approveSender.signature,
			] as const;

			const approveSimulation = await tryCatch(
				FSManager.simulate.approveSender(approveSenderArgs, {
					account: evmClient.account,
				}),
			);
			if (
				approveSimulation.error &&
				!isSenderAlreadyApprovedError(approveSimulation.error)
			) {
				return respond.err(ctx, "Invalid approveSender signature", 400);
			}

			if (!approveSimulation.error) {
				const approveWrite = await tryCatch(
					FSManager.write.approveSender(approveSenderArgs),
				);
				if (approveWrite.error) {
					if (!isSenderAlreadyApprovedError(approveWrite.error)) {
						return respond.err(ctx, "Could not approve sender", 500);
					}
				} else {
					approveSenderTxHash = approveWrite.data;
				}
			}
		}

		await db.insert(fileSignatures).values({
			filePieceCid: pieceCid,
			signer: signerAddr,
			evmSignature: signature,
			dl3Signature: dl3Signature,
			onchainTxHash: txHash,
			completedFieldIds: completedFieldIdsStored,
			completionsRoot,
			leafSchemaVersion: LEAF_SCHEMA_VERSION_V1,
			createdAt: new Date(timestamp * 1000),
		});

		await db
			.delete(fileSignerDrafts)
			.where(
				and(
					eq(fileSignerDrafts.filePieceCid, pieceCid),
					eq(fileSignerDrafts.wallet, participantRecord.wallet),
				),
			);

		return respond.ok(
			ctx,
			{ txHash, signature, approveSenderTxHash },
			"Signature recorded",
			200,
		);
	})

	.post("/:pieceCid/incentive", authenticated, async (ctx) => {
		const userWallet = ctx.var.userWallet;
		const pieceCid = ctx.req.param("pieceCid");

		const rawBody = await ctx.req.json();
		const baseSchema = z.object({
			signer: zEvmAddress(),
			token: zEvmAddress(),
			amount: z
				.string()
				.regex(/^[0-9]+$/, "amount must be a non-negative integer string"),
			usePermit: z.boolean(),
		});
		const permitSchema = baseSchema.extend({
			usePermit: z.literal(true),
			deadline: z
				.string()
				.regex(/^[0-9]+$/, "deadline must be a non-negative integer string"),
			v: z.number().int().min(0).max(255),
			r: zHexString(),
			s: zHexString(),
		});
		const allowanceSchema = baseSchema.extend({
			usePermit: z.literal(false),
		});
		const parsedBody = z
			.union([permitSchema, allowanceSchema])
			.safeParse(rawBody);
		if (parsedBody.error) {
			return respond.err(ctx, parsedBody.error.message, 400);
		}

		const { FSManager } = fsContracts;

		// Verify the file exists and the caller is the sender
		const [fileRecord] = await db
			.select({ sender: files.sender })
			.from(files)
			.where(eq(files.pieceCid, pieceCid));
		if (!fileRecord) {
			return respond.err(ctx, "File not found", 404);
		}
		if (getAddress(fileRecord.sender) !== getAddress(userWallet)) {
			return respond.err(
				ctx,
				"Only the file sender can attach incentives",
				403,
			);
		}

		const { signer, token, amount } = parsedBody.data;

		const attachResult = await tryCatch(
			parsedBody.data.usePermit
				? FSManager.write.attachIncentiveWithPermit([
						pieceCid,
						getAddress(signer),
						getAddress(token),
						BigInt(amount),
						BigInt(parsedBody.data.deadline),
						parsedBody.data.v,
						parsedBody.data.r,
						parsedBody.data.s,
					])
				: FSManager.write.attachIncentive([
						pieceCid,
						getAddress(signer),
						getAddress(token),
						BigInt(amount),
					]),
		);

		if (attachResult.error) {
			return respond.err(
				ctx,
				`Failed to attach incentive: ${attachResult.error}`,
				500,
			);
		}

		return respond.ok(ctx, {}, "Incentive attached successfully", 201);
	})

	.get("/:pieceCid/s3", authenticated, async (ctx) => {
		const pieceCid = ctx.req.param("pieceCid");
		const userWallet = ctx.var.userWallet;

		if (!pieceCid || typeof pieceCid !== "string") {
			return respond.err(ctx, "Invalid pieceCid", 400);
		}

		// Check if user is authorized to access this file (sender or recipient)
		const [fileRecord] = await db
			.select({
				pieceCid: files.pieceCid,
				sender: files.sender,
			})
			.from(files)
			.where(eq(files.pieceCid, pieceCid));

		const [participantRecord] = await db
			.select({
				wallet: fileParticipants.wallet,
			})
			.from(fileParticipants)
			.where(
				and(
					eq(fileParticipants.filePieceCid, fileRecord.pieceCid),
					eq(fileParticipants.wallet, userWallet),
				),
			);

		if (!participantRecord) {
			return respond.err(ctx, "File not found or not allowed to access", 404);
		}

		const fileExists = await bucket.exists(`uploads/${pieceCid}`);

		if (!fileExists) {
			return respond.err(ctx, "File not found on S3", 404);
		}

		const presignedUrl = bucket.presign(`uploads/${pieceCid}`, {
			method: "GET",
			expiresIn: 60 * 5, // 5 minutes
		});

		return respond.ok(ctx, { presignedUrl }, "Presigned URL retrieved", 200);
	});
