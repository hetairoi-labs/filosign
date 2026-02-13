import { EventEmitter } from "node:events";
import { createRedisSubscriber, redisPublisher } from "../redis";

const CHANNEL = "fs:events";
const localEmitter = new EventEmitter();
localEmitter.setMaxListeners(100);

export type EventPayload = Record<string, unknown>;

export function publish(topic: string, payload: EventPayload): void {
	const message = JSON.stringify({ topic, payload, ts: Date.now() });
	if (redisPublisher) {
		redisPublisher
			.publish(CHANNEL, message)
			.catch((err) => console.error("[event-bus] publish failed:", err));
	}
	localEmitter.emit(topic, payload);
}

export function subscribe(
	topic: string,
	handler: (payload: EventPayload) => void,
): () => void {
	localEmitter.on(topic, handler);
	return () => localEmitter.off(topic, handler);
}

/** Start Redis subscriber to receive events from other instances. Call once at server startup. */
export async function startRedisSubscriber(): Promise<void> {
	const subscriber = await createRedisSubscriber();
	if (!subscriber) return;
	await subscriber.subscribe(CHANNEL, (message: string) => {
		try {
			const { topic, payload } = JSON.parse(message) as {
				topic: string;
				payload: EventPayload;
			};
			localEmitter.emit(topic, payload);
		} catch (e) {
			console.error("[event-bus] invalid message:", e);
		}
	});
}

/** Topic naming: `registration:{txHash}`, `file-ack:{pieceCid}`, etc. */
export const topics = {
	registration: (txHash: string) => `registration:${txHash}`,
	fileAck: (pieceCid: string) => `file-ack:${pieceCid}`,
	fileSign: (pieceCid: string) => `file-sign:${pieceCid}`,
} as const;
