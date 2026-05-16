import { Hono } from "hono";
import { authenticated } from "@/api/middleware/auth";
import { bucket } from "@/lib/s3/client";
import { respond } from "@/lib/utils/respond";

export default new Hono().post("/upload/start", authenticated, async (ctx) => {
	const { pieceCid } = await ctx.req.json();

	if (!pieceCid || typeof pieceCid !== "string") {
		return respond.err(ctx, "Invalid pieceCid", 400);
	}

	const key = `uploads/${pieceCid}`;

	const presignedUrl = bucket.presign(key, {
		method: "PUT",
		expiresIn: 60,
		type: "application/octet-stream",
		acl: "public-read",
	});

	return respond.ok(
		ctx,
		{ uploadUrl: presignedUrl, key },
		"Presigned URL generated",
		200,
	);
});
