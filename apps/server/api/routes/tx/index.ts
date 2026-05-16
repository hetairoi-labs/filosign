import { Hono } from "hono";
import { isHash } from "viem";
import { authenticated } from "@/api/middleware/auth";
import { ProcessTxUserError } from "@/lib/indexer/errors";
import { processTransaction } from "@/lib/indexer/process";
import { respond } from "@/lib/utils/respond";
import { tryCatch } from "@/lib/utils/tryCatch";
import { zodSafeParseMessage } from "@/lib/utils/zodHttp";
import { zIndexerTxBody } from "@/lib/validation/tx-registration";

export default new Hono().post("/:hash", authenticated, async (ctx) => {
	const txHash = ctx.req.param("hash");
	const raw = await ctx.req.json().catch(() => null);

	if (typeof txHash !== "string" || !isHash(txHash)) {
		return respond.err(
			ctx,
			"Transaction hash param is required and must be a valid hash",
			400,
		);
	}

	const parsedBody = zIndexerTxBody.safeParse(raw ?? {});
	if (!parsedBody.success) {
		return respond.err(ctx, zodSafeParseMessage(parsedBody.error), 400);
	}

	const result = await tryCatch(processTransaction(txHash, parsedBody.data));
	if (!result.error) {
		return respond.ok(ctx, {}, "Transaction processed successfully", 201);
	}

	const err = result.error;
	console.error("[tx] processTransaction failed", {
		txHash,
		message: err instanceof Error ? err.message : String(err),
	});

	if (err instanceof ProcessTxUserError) {
		return respond.err(ctx, err.message, err.httpStatus);
	}

	return respond.err(
		ctx,
		"We could not index that transaction. Try again shortly.",
		500,
	);
});
