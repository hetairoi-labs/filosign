import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getAddress } from "viem";
import { authenticated } from "@/api/middleware/auth";
import db from "@/lib/db";
import { respond } from "@/lib/utils/respond";

const { files, fileAcknowledgements, fileParticipants, fileSignatures, users } =
	db.schema;

export default new Hono().get("/:pieceCid", authenticated, async (ctx) => {
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
});
