import { Hono } from "hono";
import { isHash } from "viem";
import { processTransaction } from "@/lib/indexer/process";
import { respond } from "@/lib/utils/respond";

export default new Hono().post("/:hash", async (ctx) => {
	const txHash = ctx.req.param("hash");
	const data = await ctx.req.json();

	if (typeof txHash !== "string" || !isHash(txHash)) {
		return respond.err(
			ctx,
			"Transaction hash param is required and must be a valid hash",
			400,
		);
	}

	try {
		await processTransaction(txHash, data);
		return respond.ok(ctx, {}, "Transaction processed successfully", 201);
	} catch (err) {
		return respond.err(ctx, `Error processing transaction: ${err}`, 500);
	}
});
