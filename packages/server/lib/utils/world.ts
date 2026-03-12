import type { RpContext } from "@worldcoin/idkit";
import { signRequest } from "@worldcoin/idkit/signing";
import { env } from "bun";

export function generateRpContext(action: string): RpContext {
	const signingKey = env.WORLD_ID_SIGNING_KEY;
	const rpId = env.WORLD_ID_RP_ID;
	if (!signingKey) throw new Error("WORLD_ID_SIGNING_KEY is not set");
	if (!rpId) throw new Error("WORLD_ID_RP_ID is not set");
	const { nonce, createdAt, expiresAt, sig } = signRequest(action, signingKey);
	return {
		rp_id: rpId,
		nonce,
		created_at: createdAt,
		expires_at: expiresAt,
		signature: sig,
	};
}
