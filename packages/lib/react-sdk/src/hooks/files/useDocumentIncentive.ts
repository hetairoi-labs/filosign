import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { useFilosignContext } from "../../context/FilosignProvider";

export function useDocumentIncentive(args: {
	pieceCid: string | undefined;
	signerAddress: Address | undefined;
}) {
	const { contracts, wallet } = useFilosignContext();

	return useQuery({
		queryKey: ["fsQ-document-incentive", args.pieceCid, args.signerAddress],
		queryFn: async () => {
			if (
				!contracts ||
				!wallet?.chain ||
				!args.pieceCid ||
				!args.signerAddress
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
						args.signerAddress,
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
		enabled: !!args.pieceCid && !!args.signerAddress && !!contracts && !!wallet,
	});
}
