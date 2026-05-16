import {
	FILE_ACK_COLD_CLAIM_SENTINEL_V1,
	hashNormalizedSignerEmail,
	hashPrivySubjectCommitment,
	normalizePlacementRecipientEmail,
} from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { getAddress } from "viem";
import z from "zod";
import { authenticated } from "@/api/middleware/auth";
import db from "@/lib/db";
import { fsContracts } from "@/lib/evm";
import { respond } from "@/lib/utils/respond";
import { zodSafeParseMessage } from "@/lib/utils/zodHttp";

const { FSFileRegistry } = fsContracts;

const { files, fileAcknowledgements, fileParticipants, users } = db.schema;

export default new Hono().post("/:pieceCid/ack", authenticated, async (ctx) => {
	const userWallet = ctx.var.userWallet;
	const pieceCid = ctx.req.param("pieceCid");

	const rawBody = await ctx.req.json();
	const parsedBody = z
		.object({
			signature: zHexString(),
			timestamp: z.number({ error: "timestamp must be a number" }),
		})
		.safeParse(rawBody);
	if (parsedBody.error) {
		return respond.err(ctx, zodSafeParseMessage(parsedBody.error), 400);
	}
	const { signature, timestamp } = parsedBody.data;

	const [fileRecord] = await db
		.select({
			pieceCid: files.pieceCid,
			sender: files.sender,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	if (!fileRecord) {
		return respond.err(ctx, "File not found", 404);
	}

	const [participantRecord] = await db
		.select({
			wallet: fileParticipants.wallet,
			email: users.email,
			privyDid: users.privyDid,
		})
		.from(fileParticipants)
		.innerJoin(users, eq(fileParticipants.wallet, users.walletAddress))
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
	if (existingAck && existingAck.ack !== FILE_ACK_COLD_CLAIM_SENTINEL_V1) {
		return respond.err(ctx, "File already acked", 409);
	}

	const viewerAckEmailRaw = participantRecord.email?.trim();
	if (!viewerAckEmailRaw) {
		return respond.err(ctx, "Profile email required to acknowledge", 400);
	}
	const viewerAckEmail = normalizePlacementRecipientEmail(viewerAckEmailRaw);
	const viewerEmailCommitment = hashNormalizedSignerEmail(viewerAckEmail);
	const privySubjectCommitment = hashPrivySubjectCommitment(
		participantRecord.privyDid,
	);

	const valid = await FSFileRegistry.read.validateFileAckSignature([
		pieceCid,
		fileRecord.sender,
		participantRecord.wallet,
		viewerEmailCommitment,
		privySubjectCommitment,
		BigInt(timestamp),
		signature,
	]);

	if (valid) {
		const walletNorm = getAddress(participantRecord.wallet);
		const createdAt = new Date(timestamp * 1000);
		const updatedAt = new Date();
		if (existingAck) {
			await db
				.update(fileAcknowledgements)
				.set({
					ack: signature,
					createdAt,
					updatedAt,
				})
				.where(
					and(
						eq(fileAcknowledgements.filePieceCid, pieceCid),
						eq(fileAcknowledgements.wallet, walletNorm),
					),
				);
		} else {
			await db.insert(fileAcknowledgements).values({
				filePieceCid: fileRecord.pieceCid,
				wallet: walletNorm,
				ack: signature,
				createdAt,
				updatedAt,
			});
		}
		return respond.ok(ctx, {}, "File acknowledged successfully", 200);
	} else {
		return respond.err(ctx, "Invalid signature", 400);
	}
});
