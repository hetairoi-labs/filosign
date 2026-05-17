import { z } from "zod";
import { rpcBillingEntitlementsOutputSchema } from "./billing-output";

export const rpcMetricsInvitesSummaryOutputSchema = z.object({
	sent: z.number(),
	claimed: z.number(),
	expired: z.number(),
	pending: z.number(),
	revoked: z.number(),
});

export const rpcMetricsSenderUsageOutputSchema = z.object({
	wallet: z.string(),
	planId: z.string(),
	documentsSentThisMonth: z.number(),
	limits: rpcBillingEntitlementsOutputSchema.shape.limits,
	features: rpcBillingEntitlementsOutputSchema.shape.features,
});
