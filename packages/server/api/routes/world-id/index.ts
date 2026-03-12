import { Hono } from "hono";
import { z } from "zod";
import { respond } from "@/lib/utils/respond";
import { generateRpContext } from "@/lib/utils/world";

const worldId = new Hono().post("/rp-context", async (ctx) => {
	const rawBody = await ctx.req.json();

	const parsedBody = z
		.object({
			action: z.string().min(1, "Action is required"),
		})
		.safeParse(rawBody);

	if (parsedBody.error) {
		return respond.err(ctx, parsedBody.error.message, 400);
	}

	const { action } = parsedBody.data;

	try {
		const rpContext = generateRpContext(action);

		return respond.ok(
			ctx,
			{
				...rpContext,
			},
			"RP signature generated successfully",
			201,
		);
	} catch (error) {
		console.error("World ID signing error:", error);
		return respond.err(ctx, "Failed to generate RP signature", 500);
	}
});

export default worldId;
export type WorldIdType = typeof worldId;
