import { and, desc, eq, ne, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getAddress } from "viem";
import { authenticated } from "@/api/middleware/auth";
import db from "@/lib/db";
import { respond } from "@/lib/utils/respond";

const { files, fileParticipants, shareApprovals } = db.schema;

export default new Hono()
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
	});
