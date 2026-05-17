import { useEntitlements } from "./useEntitlements";

/** Client guard for `documents.sent.monthly`. */
export function useMonthlyDocumentQuota() {
	const query = useEntitlements();
	const entry = query.data?.limits["documents.sent.monthly"];
	const monthlyLimit = typeof entry?.limit === "number" ? entry.limit : null;
	const used = entry?.used ?? 0;

	const isMonthlyQuotaExhausted =
		monthlyLimit !== null &&
		(entry?.allowed === false ||
			(entry?.remaining ?? 0) <= 0 ||
			used >= monthlyLimit);

	return {
		...query,
		monthlyLimit,
		used,
		isMonthlyQuotaExhausted,
	};
}
