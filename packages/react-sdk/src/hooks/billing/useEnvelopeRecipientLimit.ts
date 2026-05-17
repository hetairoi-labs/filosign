import { useEntitlements } from "./useEntitlements";

/** Client guard for `envelope.recipients.max` (billable slots per send, excludes sender). */
export function useEnvelopeRecipientLimit() {
	const query = useEntitlements();
	const entry = query.data?.limits["envelope.recipients.max"];
	const maxPerSend = typeof entry?.limit === "number" ? entry.limit : null;

	const canAddRecipient = (currentCount: number) => {
		if (maxPerSend === null) return true;
		return currentCount < maxPerSend;
	};

	const isWithinRecipientLimit = (currentCount: number) => {
		if (maxPerSend === null) return true;
		return currentCount <= maxPerSend;
	};

	return {
		...query,
		maxPerSend,
		canAddRecipient,
		isWithinRecipientLimit,
	};
}
