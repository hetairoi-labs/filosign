import { computeCidIdentifier, eip712signature } from "@filosign/contracts";
import {
	hashNormalizedSignerEmail,
	normalizePlacementRecipientEmail,
} from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAddress } from "viem";
import z from "zod";
import { useFilosignContext } from "../../context/useFilosignContext";
import { useAuthedApi } from "../auth/useAuthedApi";
import { useUserProfile } from "../users/useUserProfile";

export function useAckFile() {
	const { data: api } = useAuthedApi();
	const { contracts, wallet } = useFilosignContext();
	const queryClient = useQueryClient();
	const { data: userProfile } = useUserProfile();

	const zParticipant = z.union([
		z.string(),
		z.object({
			wallet: z.string(),
			name: z.string().nullable(),
			email: z.string().nullable(),
		}),
	]);

	return useMutation({
		mutationFn: async (args: { pieceCid: string }) => {
			const { pieceCid } = args;

			if (!api || !contracts || !wallet) {
				throw new Error("not connected");
			}

			const fileResponse = await api.rpc.getSafe(
				{
					pieceCid: z.string(),
					sender: z.string(),
					status: z.string(),
					createdAt: z.string(),
					signers: z.array(zParticipant),
					viewers: z.array(zParticipant),
				},
				`/files/${pieceCid}`,
			);

			if (!fileResponse.success) {
				throw new Error("Failed to fetch file info");
			}

			const { sender, signers, viewers } = fileResponse.data;

			const cidIdentifier = computeCidIdentifier(pieceCid);

			const timestamp = Math.floor(Date.now() / 1000);

			const addr = getAddress(wallet.account.address);
			let rawEmail: string | null = null;
			for (const s of signers) {
				if (typeof s === "object" && getAddress(s.wallet) === addr) {
					const e = s.email?.trim();
					if (e) {
						rawEmail = e;
						break;
					}
				}
			}
			if (!rawEmail) {
				for (const v of viewers) {
					if (typeof v === "object" && getAddress(v.wallet) === addr) {
						const e = v.email?.trim();
						if (e) {
							rawEmail = e;
							break;
						}
					}
				}
			}
			if (!rawEmail) {
				throw new Error(
					"No email on file roster for your wallet; sync your profile or re-open the document.",
				);
			}
			const viewerEmailCommitment = hashNormalizedSignerEmail(
				normalizePlacementRecipientEmail(rawEmail),
			);

			const privySubjectCommitment = userProfile?.privySubjectCommitment;
			if (!privySubjectCommitment) {
				throw new Error(
					"Profile missing Privy subject commitment; try re-login.",
				);
			}

			const signature = await eip712signature(contracts, "FSFileRegistry", {
				types: {
					AckFile: [
						{ name: "cidIdentifier", type: "bytes32" },
						{ name: "sender", type: "address" },
						{ name: "viewerWallet", type: "address" },
						{ name: "viewerEmailCommitment", type: "bytes32" },
						{ name: "privySubjectCommitment", type: "bytes32" },
						{ name: "timestamp", type: "uint256" },
					],
				},
				primaryType: "AckFile",
				message: {
					cidIdentifier,
					sender,
					viewerWallet: wallet.account.address,
					viewerEmailCommitment,
					privySubjectCommitment,
					timestamp: BigInt(timestamp),
				},
			});

			const ackResponse = await api.rpc.postSafe({}, `/files/${pieceCid}/ack`, {
				signature,
				timestamp: timestamp,
			});

			if (!ackResponse.success) {
				throw new Error("Failed to acknowledge file");
			}

			queryClient.refetchQueries({ queryKey: ["fsQ-file-info", pieceCid] });

			return ackResponse.success;
		},
	});
}
