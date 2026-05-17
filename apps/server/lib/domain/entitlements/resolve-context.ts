import {
	DEFAULT_PLAN_ID,
	type EntitlementContext,
	type FeatureKey,
	type PlanId,
} from "@filosign/entitlements";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/db";
import { userSubscriptions } from "@/lib/db/schema/billing";
import { files } from "@/lib/db/schema/file";
import { calendarMonthPeriod } from "./calendar-month";

export async function resolveEntitlementContext(
	wallet: Address,
): Promise<EntitlementContext> {
	const walletNorm = getAddress(wallet);
	const { periodStart, periodEnd } = calendarMonthPeriod();

	const [sub] = await db
		.select({
			planId: userSubscriptions.planId,
			featureOverrides: userSubscriptions.featureOverrides,
		})
		.from(userSubscriptions)
		.where(eq(userSubscriptions.walletAddress, walletNorm))
		.limit(1);

	const planId: PlanId = sub?.planId ?? DEFAULT_PLAN_ID;
	const overrides = sub?.featureOverrides ?? undefined;

	const [{ count }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(files)
		.where(
			and(
				eq(files.sender, walletNorm),
				gte(files.createdAt, periodStart),
				lt(files.createdAt, periodEnd),
			),
		);

	const usage: Partial<Record<FeatureKey, number>> = {
		"documents.sent.monthly": count ?? 0,
	};

	return {
		subject: { type: "user", wallet: walletNorm },
		planId,
		periodStart,
		usage,
		overrides,
	};
}
