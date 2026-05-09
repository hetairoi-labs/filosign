import z from "zod";
import { zHexString } from "./zod";

// IDKit v3 response item (World ID proof)
export const zIDKitResponseItemV3 = z.object({
	identifier: z.string(),
	merkle_root: zHexString(),
	nullifier: zHexString(),
	proof: zHexString(),
	signal_hash: zHexString().optional(),
});

// IDKit v3 result schema
export const zIDKitResultV3 = z.object({
	protocol_version: z.literal("3.0"),
	nonce: zHexString(),
	action: z.string(),
	action_description: z.string().optional(),
	environment: z.string(),
	responses: z.array(zIDKitResponseItemV3),
});

// IDKit v4 response item (compressed proof format)
export const zIDKitResponseItemV4 = z.object({
	identifier: z.string(),
	proof: z.array(zHexString()), // 5 hex strings
	nullifier: zHexString(),
	signal_hash: z.string().optional(),
	issuer_schema_id: z.number(),
	expires_at_min: z.number(),
});

// IDKit v4 result schema
export const zIDKitResultV4 = z.object({
	protocol_version: z.literal("4.0"),
	nonce: z.string(),
	action: z.string(),
	action_description: z.string().optional(),
	environment: z.string(),
	responses: z.array(zIDKitResponseItemV4),
});

// IDKit session response item
export const zIDKitResponseItemSession = z.object({
	identifier: z.string(),
	proof: z.array(zHexString()),
	session_nullifier: z.array(zHexString()), // 2 hex strings
	signal_hash: z.string().optional(),
	issuer_schema_id: z.number(),
	expires_at_min: z.number(),
});

// IDKit session result schema
export const zIDKitResultSession = z.object({
	protocol_version: z.literal("4.0"),
	nonce: z.string(),
	session_id: z.string(),
	action_description: z.string().optional(),
	environment: z.string(),
	responses: z.array(zIDKitResponseItemSession),
});

// Union of all IDKit result types
export const zIDKitResult = z.union([
	zIDKitResultV3,
	zIDKitResultV4,
	zIDKitResultSession,
]);

// Inferred TypeScript types
export type IDKitResultV3 = z.infer<typeof zIDKitResultV3>;
export type IDKitResultV4 = z.infer<typeof zIDKitResultV4>;
export type IDKitResultSession = z.infer<typeof zIDKitResultSession>;
export type IDKitResult = z.infer<typeof zIDKitResult>;
