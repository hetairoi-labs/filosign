import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getAddress } from "viem";
import { authenticated } from "@/api/middleware/auth";
import {
	buildComplianceBundleAndHash,
	insertComplianceExportLog,
} from "@/lib/compliance/buildComplianceBundle";
import db from "@/lib/db";
import { respond } from "@/lib/utils/respond";
import { tryCatch } from "@/lib/utils/tryCatch";

const { files, fileParticipants, users } = db.schema;

export default new Hono().get(
	"/:pieceCid/compliance-bundle",
	authenticated,
	async (ctx) => {
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
				privyDid: users.privyDid,
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
			privyDid: p.privyDid ?? null,
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
	},
);
