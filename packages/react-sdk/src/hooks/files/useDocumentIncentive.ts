import { useQuery } from "@tanstack/react-query";
import type { Address, Hex } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { filosignKeys } from "../../lib/query-keys";

export function useDocumentIncentive(args: {
	pieceCid: string | undefined;
	signerEmailCommitment: Hex | undefined;
}) {
	const { contracts, wallet } = useFilosignContext();

	return useQuery({
		queryKey: filosignKeys.documentIncentive(
			args.pieceCid,
			args.signerEmailCommitment,
		),
		queryFn: async () => {
			if (
				!contracts ||
				!wallet?.chain ||
				!args.pieceCid ||
				!args.signerEmailCommitment
			) {
				return null;
			}

			try {
				const cidId = await contracts.FSFileRegistry.read.cidIdentifier([
					args.pieceCid,
				]);

				const [token, amount, claimed] =
					await contracts.FSFileRegistry.read.getSignerIncentive([
						cidId,
						args.signerEmailCommitment,
					]);

				return {
					token: token.toLowerCase() as Address,
					amount,
					claimed,
				};
			} catch (err) {
				console.error("Failed to fetch document incentive:", err);
				return null;
			}
		},
		enabled:
			!!args.pieceCid &&
			!!args.signerEmailCommitment &&
			!!contracts &&
			!!wallet,
	});
}
