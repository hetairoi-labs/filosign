import { zHexString } from "@filosign/shared/zod";
import { z } from "zod";

export const rpcAuthNonceOutputSchema = z.object({
	nonce: zHexString(),
});

export const rpcAuthVerifyOutputSchema = z.object({
	valid: z.literal(true),
	token: z.string(),
});
