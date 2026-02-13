import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { subscribe } from "../../lib/events/bus";

const app = new Hono();

/** GET /api/subscriptions?topics=registration:0x123,file-ack:abc */
app.get("/", async (c) => {
	const raw = c.req.query("topics");
	if (!raw?.trim()) {
		return c.json(
			{ error: "Missing topics query (e.g. ?topics=registration:0x123)" },
			400,
		);
	}
	const topicList = raw
		.split(",")
		.map((t) => t.trim())
		.filter(Boolean);
	if (topicList.length === 0) {
		return c.json({ error: "No valid topics" }, 400);
	}

	return streamSSE(c, async (stream) => {
		const unsubscribes: Array<() => void> = [];
		let resolveClosed: () => void;
		const closed = new Promise<void>((r) => {
			resolveClosed = r;
		});

		stream.onAbort(() => {
			for (const unsub of unsubscribes) unsub();
			clearInterval(keepalive);
			resolveClosed();
		});

		/** Keep proxy/load balancer from closing idle connection (504) */
		const keepalive = setInterval(() => {
			stream
				.writeSSE({
					data: JSON.stringify({ topic: "_", payload: { keepalive: true } }),
					event: "message",
				})
				.catch(() => {});
		}, 15_000);

		for (const topic of topicList) {
			unsubscribes.push(
				subscribe(topic, (payload) => {
					stream
						.writeSSE({
							data: JSON.stringify({ topic, payload }),
							event: "message",
						})
						.catch((err) => console.error("[sse] write failed:", err));
				}),
			);
		}

		await closed;
	});
});

export default app;
