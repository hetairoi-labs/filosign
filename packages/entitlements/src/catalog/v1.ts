import type { FeatureKey } from "../features";
import type { PlanEntitlements, PlanId } from "../types";

const teamProductFeatures = {
	"features.shared_templates": { kind: "boolean", enabled: true },
	"features.comments": { kind: "boolean", enabled: true },
	"features.envelope.team_visibility": { kind: "boolean", enabled: true },
	"features.routing.advanced": { kind: "boolean", enabled: true },
	"features.integrations.custom": { kind: "boolean", enabled: false },
} as const satisfies Pick<
	PlanEntitlements,
	| "features.shared_templates"
	| "features.comments"
	| "features.envelope.team_visibility"
	| "features.routing.advanced"
	| "features.integrations.custom"
>;

const disabledProductFeatures = {
	"features.shared_templates": { kind: "boolean", enabled: false },
	"features.comments": { kind: "boolean", enabled: false },
	"features.envelope.team_visibility": { kind: "boolean", enabled: false },
	"features.routing.advanced": { kind: "boolean", enabled: false },
	"features.integrations.custom": { kind: "boolean", enabled: false },
} as const satisfies Pick<
	PlanEntitlements,
	| "features.shared_templates"
	| "features.comments"
	| "features.envelope.team_visibility"
	| "features.routing.advanced"
	| "features.integrations.custom"
>;

/** Versioned plan catalog — change via PR + tests; bump version when breaking. */
export const catalogV1: Record<PlanId, PlanEntitlements> = {
	free: {
		"documents.sent.monthly": {
			kind: "quota",
			limit: 3,
			period: "calendar_month",
			scope: "account",
		},
		"envelope.recipients.max": { kind: "max", limit: 1 },
		...disabledProductFeatures,
	},
	individual: {
		"documents.sent.monthly": {
			kind: "quota",
			limit: 10,
			period: "calendar_month",
			scope: "account",
		},
		"envelope.recipients.max": { kind: "max", limit: 5 },
		...disabledProductFeatures,
	},
	teams: {
		"documents.sent.monthly": {
			kind: "quota",
			limit: 10,
			period: "calendar_month",
			scope: "per_seat",
		},
		"envelope.recipients.max": { kind: "max", limit: 10 },
		...teamProductFeatures,
	},
	enterprise: {
		"documents.sent.monthly": {
			kind: "quota",
			limit: null,
			period: "calendar_month",
			scope: "account",
		},
		"envelope.recipients.max": { kind: "max", limit: null },
		...teamProductFeatures,
		"features.integrations.custom": { kind: "boolean", enabled: true },
	},
};

export const CATALOG_VERSION = 1 as const;

export function catalogEntitlement(
	planId: PlanId,
	featureKey: FeatureKey,
): PlanEntitlements[FeatureKey] {
	return catalogV1[planId][featureKey];
}
