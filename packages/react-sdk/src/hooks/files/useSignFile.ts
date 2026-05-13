import { computeCidIdentifier, eip712signature } from "@filosign/contracts";
import {
	computeCommitment,
	jsonStringify,
	signatures,
	toHex,
} from "@filosign/crypto-utils";
import {
	completionsMerkleRootV1,
	LEAF_SCHEMA_VERSION_V1,
	zPlacementManifest,
} from "@filosign/shared";
import { useMutation } from "@tanstack/react-query";
import type { Hex } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { useFilosignContext } from "../../context/useFilosignContext";
import { useCryptoSeed } from "../auth";

export function useSignFile() {
	const { contracts, wallet, api, wasm } = useFilosignContext();
	const { action: cryptoAction } = useCryptoSeed();

	const zParticipant = z.union([
		z.string(),
		z.object({
			wallet: z.string(),
			name: z.string().nullable(),
			email: z.string().nullable(),
		}),
	]);

	return useMutation({
		mutationFn: async (args: {
			pieceCid: string;
			completedFieldIds?: string[];
		}) => {
			let success = false;

			const { pieceCid, completedFieldIds } = args;
			const timestamp = Math.floor(Date.now() / 1000);
			const textEncoder = new TextEncoder();

			if (!contracts || !wallet || !wasm.dilithium || !api) {
				throw new Error("not connected");
			}

			await cryptoAction(async (seed: Uint8Array) => {
				const fileResponse = await api.rpc.getSafe(
					{
						pieceCid: z.string(),
						sender: z.string(),
						status: z.string(),
						createdAt: z.string(),
						placementCommitment: z.string(),
						placementManifest: z.unknown(),
						signers: z.array(zParticipant),
						viewers: z.array(zParticipant),
					},
					`/files/${pieceCid}`,
				);

				if (!fileResponse.success) {
					throw new Error("Failed to fetch file info");
				}

				const {
					sender,
					placementCommitment,
					placementManifest: manifestRaw,
				} = fileResponse.data;

				const manifest = zPlacementManifest.parse(manifestRaw);
				const signerAddr = getAddress(wallet.account.address);
				const placementCommitmentHex = placementCommitment as Hex;

				const assignedIds = manifest.fields
					.filter((f) => getAddress(f.assignedSigner) === signerAddr)
					.map((f) => f.id);

				let fieldIds: string[];
				if (completedFieldIds !== undefined) {
					const allowed = new Set(assignedIds);
					for (const id of completedFieldIds) {
						if (!allowed.has(id)) {
							throw new Error(
								"completedFieldIds must match manifest fields for signer",
							);
						}
					}
					fieldIds = completedFieldIds;
				} else {
					fieldIds = assignedIds;
				}

				if (fieldIds.length === 0) {
					throw new Error("No fields assigned to this signer");
				}

				const completionsRoot = completionsMerkleRootV1({
					fieldIds,
					placementCommitment: placementCommitmentHex,
					pieceCid,
					signer: signerAddr,
				});

				const cidIdentifier = computeCidIdentifier(pieceCid);

				const nonce = await contracts.FSFileRegistry.read.nonce([
					wallet.account.address,
				]);
				const approveSenderNonce = await contracts.FSManager.read.approveNonce([
					wallet.account.address,
				]);
				const approveSenderDeadline = BigInt(
					Math.floor(Date.now() / 1000) + 10 * 60,
				);

				const dl3SignatureMessage = jsonStringify({
					pieceCid,
					sender,
					signer: wallet.account.address,
					timestamp,
					completionsRoot,
					leafSchemaVersion: LEAF_SCHEMA_VERSION_V1,
				});
				const dl3Keypair = await signatures.keyGen({
					dl: wasm.dilithium,
					seed: seed,
				});
				const dl3Signature = await signatures.sign({
					dl: wasm.dilithium,
					privateKey: dl3Keypair.privateKey,
					message: textEncoder.encode(dl3SignatureMessage),
				});

				const dl3SignatureCommitment = computeCommitment([toHex(dl3Signature)]);
				const signature = await eip712signature(contracts, "FSFileRegistry", {
					types: {
						SignFile: [
							{ name: "cidIdentifier", type: "bytes32" },
							{ name: "sender", type: "address" },
							{ name: "signer", type: "address" },
							{ name: "dl3SignatureCommitment", type: "bytes20" },
							{ name: "completionsRoot", type: "bytes32" },
							{ name: "leafSchemaVersion", type: "uint8" },
							{ name: "timestamp", type: "uint256" },
							{ name: "nonce", type: "uint256" },
						],
					},
					primaryType: "SignFile",
					message: {
						cidIdentifier,
						sender,
						signer: wallet.account.address,
						dl3SignatureCommitment,
						completionsRoot,
						leafSchemaVersion: LEAF_SCHEMA_VERSION_V1,
						timestamp: BigInt(timestamp),
						nonce: BigInt(nonce),
					},
				});
				const approveSenderSignature = await eip712signature(
					contracts,
					"FSManager",
					{
						types: {
							ApproveSender: [
								{ name: "recipient", type: "address" },
								{ name: "sender", type: "address" },
								{ name: "nonce", type: "uint256" },
								{ name: "deadline", type: "uint256" },
							],
						},
						primaryType: "ApproveSender",
						message: {
							recipient: wallet.account.address,
							sender,
							nonce: BigInt(approveSenderNonce),
							deadline: approveSenderDeadline,
						},
					},
				);
				const signResponse = await api.rpc.postSafe(
					{},
					`/files/${pieceCid}/sign`,
					{
						signature,
						timestamp: timestamp,
						dl3Signature: toHex(dl3Signature),
						approveSender: {
							nonce: approveSenderNonce.toString(),
							deadline: approveSenderDeadline.toString(),
							signature: approveSenderSignature,
						},
						...(completedFieldIds !== undefined ? { completedFieldIds } : {}),
					},
				);
				success = signResponse.success;
			});

			return success;
		},
	});
}
