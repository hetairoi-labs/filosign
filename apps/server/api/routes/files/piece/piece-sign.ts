import {
	computeCommitment,
	jsonStringify,
	signatures,
	toBytes,
} from "@filosign/crypto-utils/node";
import {
	completionsMerkleRootV1,
	hashNormalizedSignerEmail,
	hashPrivySubjectCommitment,
	LEAF_SCHEMA_VERSION_V1,
	normalizePlacementRecipientEmail,
	requiredFieldIdsForRecipientEmail,
	sortedSignerCommitsForManifest,
	zPlacementManifest,
} from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Address } from "viem";
import { getAddress, zeroAddress } from "viem";
import z from "zod";
import { authenticated } from "@/api/middleware/auth";
import db from "@/lib/db";
import { evmClient, fsContracts } from "@/lib/evm";
import { respond } from "@/lib/utils/respond";
import { tryCatch } from "@/lib/utils/tryCatch";
import { zodSafeParseMessage } from "@/lib/utils/zodHttp";
import {
	isSenderAlreadyApprovedError,
	primaryEmailForWallet,
} from "../helpers";

const { FSFileRegistry, FSManager } = fsContracts;

const { files, fileParticipants, fileSignatures, fileSignerDrafts, users } =
	db.schema;

export default new Hono().post(
	"/:pieceCid/sign",
	authenticated,
	async (ctx) => {
		const userWallet = ctx.var.userWallet;
		const pieceCid = ctx.req.param("pieceCid");
		const encoder = new TextEncoder();
		const dilithium = await signatures.dilithiumInstance();

		const rawBody = await ctx.req.json();

		const parsedBody = z
			.object({
				signature: zHexString(),
				timestamp: z.number({ error: "timestamp must be a number" }),
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
			return respond.err(ctx, zodSafeParseMessage(parsedBody.error), 400);
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
				privyDid: users.privyDid,
			})
			.from(fileParticipants)
			.innerJoin(users, eq(fileParticipants.wallet, users.walletAddress))
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
		const signerEmail = await primaryEmailForWallet(participantRecord.wallet);
		if (!signerEmail) {
			return respond.err(
				ctx,
				"Add a primary email to your Filosign profile to sign placement fields",
				400,
			);
		}
		const assignedForSigner = manifestParsed.data.fields.filter(
			(f) => f.assignedRecipientEmail === signerEmail,
		);
		const allowedIds = new Set(assignedForSigner.map((f) => f.id));

		const requiredIds = requiredFieldIdsForRecipientEmail(
			manifestParsed.data,
			signerEmail,
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

		const signerEmailCommitment = hashNormalizedSignerEmail(signerEmail);

		const privySubjectCommitment = hashPrivySubjectCommitment(
			participantRecord.privyDid,
		);

		const allSignerEmailCommitments = sortedSignerCommitsForManifest(
			manifestParsed.data,
		);

		const signerRows = await db
			.select({
				wallet: fileParticipants.wallet,
				email: users.email,
			})
			.from(fileParticipants)
			.innerJoin(users, eq(fileParticipants.wallet, users.walletAddress))
			.where(
				and(
					eq(fileParticipants.filePieceCid, pieceCid),
					eq(fileParticipants.role, "signer"),
				),
			);

		const walletByC = new Map<string, Address>();
		for (const r of signerRows) {
			const raw = r.email?.trim();
			if (!raw) continue;
			const c = hashNormalizedSignerEmail(
				normalizePlacementRecipientEmail(raw),
			);
			walletByC.set(c.toLowerCase() as string, getAddress(r.wallet));
		}

		const payouts = allSignerEmailCommitments.map(
			(c) =>
				walletByC.get(c.toLowerCase() as string) ?? (zeroAddress as Address),
		);

		const registerSignatureArgs = [
			pieceCid,
			fileRecord.sender,
			participantRecord.wallet,
			signerEmailCommitment,
			privySubjectCommitment,
			dl3SignatureCommitment,
			BigInt(timestamp),
			signature,
			allSignerEmailCommitments,
			payouts,
			completionsRoot,
			LEAF_SCHEMA_VERSION_V1,
		] as const;

		try {
			await FSFileRegistry.simulate.registerFileSignature(
				registerSignatureArgs,
				{
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
	},
);
