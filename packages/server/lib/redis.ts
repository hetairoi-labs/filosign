import { RedisClient } from "bun";
import env from "@/env";

const redisUrl = env.REDIS_URL;

export const redisPublisher: RedisClient | null = redisUrl
	? new RedisClient(redisUrl)
	: null;

export async function createRedisSubscriber(): Promise<RedisClient | null> {
	if (!redisPublisher) return null;
	await redisPublisher.connect();
	return redisPublisher.duplicate() as Promise<RedisClient>;
}

export const hasRedis = !!redisUrl;
