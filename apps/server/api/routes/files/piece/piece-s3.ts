import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authenticated } from "@/api/middleware/auth";
import db from "@/lib/db";
import { bucket } from "@/lib/s3/client";
import { respond } from "@/lib/utils/respond";

const { files, fileParticipants } = db.schema;

export default new Hono().get("/:pieceCid/s3", authenticated, async (ctx) => {
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

	if (!fileRecord) {
		return respond.err(ctx, "File not found or not allowed to access", 404);
	}

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
