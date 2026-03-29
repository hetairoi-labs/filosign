import {
	computeCommitment,
	jsonStringify,
	signatures,
	toBytes,
} from "@filosign/crypto-utils/node";
import { zIDKitResult } from "@filosign/shared/world";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { and, eq, ne } from "drizzle-orm";
import { Hono } from "hono";
import { decodeAbiParameters, getAddress } from "viem";
import z from "zod";
import { authenticated } from "@/api/middleware/auth";
import db from "@/lib/db";
import { evmClient, fsContracts } from "@/lib/evm";
import { bucket } from "@/lib/s3/client";
import { getOrCreateUserDataset } from "@/lib/synapse";
import { respond } from "@/lib/utils/respond";
import { tryCatch } from "@/lib/utils/tryCatch";

const { FSFileRegistry } = fsContracts;

const MAX_FILE_SIZE = 30 * 1024 * 1024;

const { files, fileAcknowledgements, fileParticipants, fileSignatures, users } =
	db.schema;

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
		} = parsedBody.data;
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
		]);
		const ds = await getOrCreateUserDataset(sender);
		const actualSize = bytes.byteLength;
		const preflight = await ds.preflightUpload({
			size: Math.ceil(actualSize),
		});
		if (!preflight.allowanceCheck.sufficient) {
			return respond.err(
				ctx,
				"Insufficient storage allowance, complain to the devs",
				402,
			);
		}

		await db.transaction(async (tx) => {
			const [insertResult] = await tx
				.insert(files)
				.values({
					pieceCid,
					status: "s3",
					sender,
					onchainTxHash: txHash,
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

		ds.upload(new Uint8Array(bytes), { pieceCid, metadata: {} })
			.then(async (uploadResult) => {
				await file.delete();

				if (uploadResult.pieceCid.toString() !== pieceCid) {
					await db.delete(files).where(eq(files.pieceCid, pieceCid));
				}

				await db
					.update(files)
					.set({ status: "foc" })
					.where(eq(files.pieceCid, pieceCid))
					.catch(async (_) => {
						await db.delete(files).where(eq(files.pieceCid, pieceCid));
					});
			})
			.catch((err) => {
				console.warn(
					"Filecoin addPieces failed (file remains in S3):",
					err?.message ?? err,
				);
			});

		return respond.ok(ctx, {}, "File uploaded to filecoin warmstorage", 201);
	})

	.get("/sent", authenticated, async (ctx) => {
		const userWallet = ctx.var.userWallet;

		const sentFiles = await db
			.select({
				pieceCid: files.pieceCid,
				sender: files.sender,
				status: files.status,
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
				status: files.status,
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

		return respond.ok(
			ctx,
			{ files: receivedFiles },
			"Received files retrieved",
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
				status: files.status,
				onchainTxHash: files.onchainTxHash,
				createdAt: files.createdAt,
			})
			.from(files)
			.where(eq(files.pieceCid, pieceCid));

		const participants = await db
			.select({
				wallet: fileParticipants.wallet,
				role: fileParticipants.role,
				kemCiphertext: fileParticipants.kemCiphertext,
				encryptedEncryptionKey: fileParticipants.encryptedEncryptionKey,
			})
			.from(fileParticipants)
			.where(eq(fileParticipants.filePieceCid, pieceCid));

		if (!fileRecord) {
			return respond.err(ctx, "File not found", 404);
		}
		const userWalletNorm = getAddress(userWallet);
		const participantUser = participants.find(
			(p) => getAddress(p.wallet) === userWalletNorm,
		);
		if (!participantUser) {
			return respond.err(ctx, "You dont need to access this fle :D", 403);
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
			.map((p) => getAddress(p.wallet))
			.sort();

		const viewers = participants
			.filter((p) => p.role === "viewer")
			.map((p) => getAddress(p.wallet))
			.sort();

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
				worldIdProof: zIDKitResult,
			})
			.safeParse(rawBody);
		if (parsedBody.error) {
			return respond.err(ctx, parsedBody.error.message, 400);
		}
		const { signature, timestamp, dl3Signature, worldIdProof } =
			parsedBody.data;

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
			timestamp: timestamp,
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

		if (worldIdProof.protocol_version !== "3.0") {
			return respond.err(ctx, "Need World ID v3 proof to work", 400);
		}

		const worldIdResponse = worldIdProof.responses[0];
		if (!worldIdResponse) {
			return respond.err(ctx, "Missing World ID response", 400);
		}

		const unpackedProof = decodeAbiParameters(
			[{ type: "uint256[8]" }],
			worldIdResponse.proof,
		)[0];

		try {
			await FSFileRegistry.simulate.registerFileSignatureWorldId(
				[
					pieceCid,
					fileRecord.sender,
					participantRecord.wallet,
					dl3SignatureCommitment,
					BigInt(worldIdResponse.merkle_root),
					BigInt(worldIdResponse.nullifier),
					unpackedProof,
					BigInt(timestamp),
					signature,
				],
				{
					// viem simulates via the public client; `account` sets `msg.sender` for `onlyServer`.
					account: evmClient.account,
				},
			);
		} catch (_err) {
			return respond.err(ctx, "Invalid World ID proof", 400);
		}

		const txHash = await FSFileRegistry.write.registerFileSignatureWorldId([
			pieceCid,
			fileRecord.sender,
			participantRecord.wallet,
			dl3SignatureCommitment,
			BigInt(worldIdResponse.merkle_root),
			BigInt(worldIdResponse.nullifier),
			unpackedProof,
			BigInt(timestamp),
			signature,
		]);

		await db.insert(fileSignatures).values({
			filePieceCid: pieceCid,
			signer: participantRecord.wallet,
			evmSignature: signature,
			dl3Signature: dl3Signature,
			onchainTxHash: txHash,
			createdAt: new Date(timestamp * 1000),
		});

		return respond.ok(ctx, {}, "File signed successfully", 200);
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
