import { useRpSignature } from "@filosign/react/hooks";
import type { RpContext } from "@worldcoin/idkit";
import { useEffect, useState } from "react";

export function useWorldIdContext(pieceCid: string | null) {
	const [rpContext, setRpContext] = useState<RpContext | null>(null);
	const getRpContext = useRpSignature();

	useEffect(() => {
		if (!pieceCid) {
			setRpContext(null);
			return;
		}

		let mounted = true;

		const fetchContext = async () => {
			try {
				const context = await getRpContext.mutateAsync({ action: pieceCid });
				if (mounted) {
					setRpContext({
						rp_id: context.rp_id,
						nonce: context.nonce,
						created_at: Number(context.created_at),
						expires_at: Number(context.expires_at),
						signature: context.signature,
					});
				}
			} catch (error) {
				console.error("Failed to fetch World ID context:", error);
				if (mounted) {
					setRpContext(null);
				}
			}
		};

		fetchContext();

		return () => {
			mounted = false;
		};
	}, [pieceCid, getRpContext]);

	return {
		rpContext,
		isLoading: getRpContext.isPending,
		isError: getRpContext.isError,
		error: getRpContext.error,
		refetch: () => {
			if (pieceCid) {
				getRpContext.mutateAsync({ action: pieceCid });
			}
		},
	};
}
