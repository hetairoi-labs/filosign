import { PLAN_IDS } from "@filosign/entitlements";
import { z } from "zod";

const limitSnapshotSchema = z.object({
	limit: z.union([z.number(), z.boolean(), z.null()]),
	used: z.number().optional(),
	remaining: z.union([z.number(), z.null()]).optional(),
	allowed: z.boolean(),
});

export const rpcBillingEntitlementsOutputSchema = z.object({
	planId: z.enum(PLAN_IDS),
	limits: z.object({
		"documents.sent.monthly": limitSnapshotSchema,
		"envelope.recipients.max": limitSnapshotSchema,
	}),
	features: z.record(z.string(), z.object({ enabled: z.boolean() })),
});
