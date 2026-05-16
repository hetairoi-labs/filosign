import { zPlacementManifest } from "@filosign/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";
import { authenticated } from "@/api/middleware/auth";
import db from "@/lib/db";
import { respond } from "@/lib/utils/respond";
import { zodSafeParseMessage } from "@/lib/utils/zodHttp";
import { primaryEmailForWallet } from "../helpers";

const { files, fileParticipants, fileSignerDrafts } = db.schema;

export default new Hono()
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

		const signerEmail = await primaryEmailForWallet(participantRecord.wallet);
		if (!signerEmail) {
			return respond.err(
				ctx,
				"Add a primary email to your Filosign profile to use placement drafts",
				400,
			);
		}
		const allowedIds = new Set(
			manifestParsed.data.fields
				.filter((f) => f.assignedRecipientEmail === signerEmail)
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
			return respond.err(ctx, zodSafeParseMessage(parsedBody.error), 400);
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

		const signerEmail = await primaryEmailForWallet(participantRecord.wallet);
		if (!signerEmail) {
			return respond.err(
				ctx,
				"Add a primary email to your Filosign profile to use placement drafts",
				400,
			);
		}
		const allowedIds = new Set(
			manifestParsed.data.fields
				.filter((f) => f.assignedRecipientEmail === signerEmail)
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
	});
