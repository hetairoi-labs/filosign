import { z } from "zod";

export const rpcStoragePresignPutOutputSchema = z.object({
	uploadUrl: z.string(),
	key: z.string(),
	expiresInSeconds: z.number().int().positive(),
});
