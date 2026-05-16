import {
	assessInvoiceForAml,
	computeSignerNetPayout,
	hashInvoiceMemo,
	validateInvoiceMemo,
} from "@filosign/shared";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Hex } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { authenticated } from "@/api/middleware/auth";
import config from "@/config";
import db from "@/lib/db";
import { fsContracts } from "@/lib/evm";
import { respond } from "@/lib/utils/respond";
import tryCatchSync, { tryCatch } from "@/lib/utils/tryCatch";
import { zodSafeParseMessage } from "@/lib/utils/zodHttp";
import { isIncentiveTokenAllowed } from "../helpers";

const { FSManager } = fsContracts;

const { files, fileIncentiveAttaches } = db.schema;

export default new Hono().post(
	"/:pieceCid/incentive",
	authenticated,
	async (ctx) => {
		const userWallet = ctx.var.userWallet;
		const pieceCid = ctx.req.param("pieceCid");

		const rawBody = await ctx.req.json();
		const zBytes32Hex = z.string().regex(/^0x[a-fA-F0-9]{64}$/, {
			error: "signerEmailCommitment must be bytes32 hex",
		});

		const baseSchema = z.object({
			signerEmailCommitment: zBytes32Hex.transform((s) => s as Hex),
			token: zEvmAddress(),
			memo: z.string(),
			amount: z.string().regex(/^[0-9]+$/, {
				error: "amount must be a non-negative integer string",
			}),
			usePermit: z.boolean(),
		});
		const permitSchema = baseSchema.extend({
			usePermit: z.literal(true),
			deadline: z.string().regex(/^[0-9]+$/, {
				error: "deadline must be a non-negative integer string",
			}),
			v: z.int().min(0).max(255),
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
			return respond.err(ctx, zodSafeParseMessage(parsedBody.error), 400);
		}

		const memoValidated = tryCatchSync(() =>
			validateInvoiceMemo(parsedBody.data.memo),
		);
		if (memoValidated.error) {
			return respond.err(ctx, memoValidated.error.message, 400);
		}
		const { normalized: incentiveMemo } = memoValidated.data;
		if (assessInvoiceForAml(incentiveMemo) === "blocked") {
			return respond.err(ctx, "Incentive memo blocked by policy", 400);
		}

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
				"Only the file sender can attach signer incentives",
				403,
			);
		}

		const { signerEmailCommitment, token, amount } = parsedBody.data;
		const tokenAddr = getAddress(token);
		if (!isIncentiveTokenAllowed(config.runtimeChain.id, tokenAddr)) {
			return respond.err(
				ctx,
				"Only canonical incentive USDC is allowed for this chain",
				400,
			);
		}

		const memoHash = hashInvoiceMemo({
			memo: incentiveMemo,
			pieceCid,
			signerEmailCommitment,
			amount,
			token: tokenAddr,
		});

		const attachResult = await tryCatch(
			parsedBody.data.usePermit
				? FSManager.write.attachIncentiveWithPermit([
						pieceCid,
						signerEmailCommitment,
						tokenAddr,
						BigInt(amount),
						memoHash,
						BigInt(parsedBody.data.deadline),
						parsedBody.data.v,
						parsedBody.data.r,
						parsedBody.data.s,
					])
				: FSManager.write.attachIncentive([
						pieceCid,
						signerEmailCommitment,
						tokenAddr,
						BigInt(amount),
						memoHash,
					]),
		);

		if (attachResult.error) {
			return respond.err(
				ctx,
				`Failed to attach incentive: ${attachResult.error}`,
				500,
			);
		}

		const txHash = attachResult.data as `0x${string}`;
		const ins = await tryCatch(
			db.insert(fileIncentiveAttaches).values({
				filePieceCid: pieceCid,
				signerEmailCommitment: signerEmailCommitment as string,
				token: getAddress(token),
				amount,
				txHash,
			}),
		);
		if (ins.error) {
			return respond.err(
				ctx,
				`Incentive attached on-chain but failed to record tx: ${ins.error}`,
				500,
			);
		}

		const platformFeeBps = Number(await FSManager.read.platformFeeBps());
		const gross = BigInt(amount);
		const signerNetAmount = computeSignerNetPayout(
			gross,
			platformFeeBps,
		).toString();

		return respond.ok(
			ctx,
			{ txHash, platformFeeBps, grossAmount: amount, signerNetAmount },
			"Incentive attached successfully",
			201,
		);
	},
);
