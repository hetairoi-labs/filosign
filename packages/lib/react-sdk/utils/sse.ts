/** SSE event shape from /api/subscriptions */
export type SSEEvent = {
	topic: string;
	payload: Record<string, unknown>;
};

export type SubscribeSSEOptions = {
	timeout?: number;
	matcher?: (event: SSEEvent) => boolean;
};

export function subscribeSSE(
	baseUrl: string,
	topicList: string[],
	options?: SubscribeSSEOptions,
): Promise<SSEEvent> {
	const { timeout = 120_000, matcher = () => true } = options ?? {};
	const topicsParam = topicList.map((t) => encodeURIComponent(t)).join(",");
	const url = `${baseUrl.replace(/\/$/, "")}/subscriptions?topics=${topicsParam}`;

	return new Promise((resolve, reject) => {
		const es = new EventSource(url);
		const t = setTimeout(() => {
			es.close();
			reject(new Error("Subscription timeout"));
		}, timeout);

		es.onmessage = (e) => {
			try {
				const event = JSON.parse(e.data) as SSEEvent;
				if (matcher(event)) {
					clearTimeout(t);
					es.close();
					resolve(event);
				}
			} catch {
				console.error("[sse] Failed to parse SSE event:", e.data);
			}
		};

		es.onerror = () => {
			clearTimeout(t);
			es.close();
			reject(new Error("Subscription connection lost"));
		};
	});
}

export const sseTopics = {
	registration: (txHash: string) => `registration:${txHash}`,
	fileAck: (pieceCid: string) => `file-ack:${pieceCid}`,
	fileSign: (pieceCid: string) => `file-sign:${pieceCid}`,
} as const;
