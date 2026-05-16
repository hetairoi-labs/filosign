import { computeCidIdentifier, eip712signature } from "@filosign/contracts";
import {
	computeCommitment,
	jsonStringify,
	signatures,
	toHex,
} from "@filosign/crypto-utils";
import {
	completionsMerkleRootV1,
	hashNormalizedSignerEmail,
	LEAF_SCHEMA_VERSION_V1,
	normalizePlacementRecipientEmail,
	zPlacementManifest,
} from "@filosign/shared";
import type { InferClientOutputs } from "@orpc/client";
import { useMutation } from "@tanstack/react-query";
import type { Hex } from "viem";
import { getAddress } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { useCryptoSeed } from "../auth";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { useUserProfile } from "../users/useUserProfile";

export function useSignFile() {
	const { contracts, wallet, wasm } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const { action: cryptoAction } = useCryptoSeed();
	const { data: userProfile } = useUserProfile();

	type PieceDetail =
		InferClientOutputs<AppRouterClient>["files"]["piece"]["detail"];

	return useMutation({
		mutationFn: async (args: {
			pieceCid: string;
			completedFieldIds?: string[];
		}) => {
			let success = false;

			const { pieceCid, completedFieldIds } = args;
			const timestamp = Math.floor(Date.now() / 1000);
			const textEncoder = new TextEncoder();

			if (!contracts || !wallet || !wasm.dilithium || !isAuthed) {
				throw new Error("not connected");
			}

			await cryptoAction(async (seed: Uint8Array) => {
				const fileResponse: PieceDetail =
					await rpcQuery.files.piece.detail.call({
						pieceCid,
					});

				const {
					sender,
					placementCommitment,
					placementManifest: manifestRaw,
				} = fileResponse;

				const manifest = zPlacementManifest.parse(manifestRaw);
				const signerAddr = getAddress(wallet.account.address);

				const selfSigner = fileResponse.signers.find(
					(s) => getAddress(s.wallet) === signerAddr,
				);
				const rawEmail = selfSigner?.email?.trim() ?? "";
				if (!rawEmail) {
					throw new Error(
						"Your Filosign profile must include an email to sign placed fields for this document",
					);
				}
				const signerEmail = normalizePlacementRecipientEmail(rawEmail);
				const signerEmailCommitment = hashNormalizedSignerEmail(signerEmail);

				const privySubjectCommitment = userProfile?.privySubjectCommitment;
				if (!privySubjectCommitment) {
					throw new Error(
						"Profile missing Privy subject commitment; try re-login.",
					);
				}

				const placementCommitmentHex = placementCommitment as Hex;

				const assignedIds = manifest.fields
					.filter((f) => f.assignedRecipientEmail === signerEmail)
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
							{ name: "signerWallet", type: "address" },
							{ name: "signerEmailCommitment", type: "bytes32" },
							{ name: "privySubjectCommitment", type: "bytes32" },
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
						signerWallet: wallet.account.address,
						signerEmailCommitment,
						privySubjectCommitment,
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
				await rpcQuery.files.piece.sign.call({
					pieceCid,
					body: {
						signature,
						timestamp,
						dl3Signature: toHex(dl3Signature),
						approveSender: {
							nonce: approveSenderNonce.toString(),
							deadline: approveSenderDeadline.toString(),
							signature: approveSenderSignature,
						},
						...(completedFieldIds !== undefined ? { completedFieldIds } : {}),
					},
				});
				success = true;
			});

			return success;
		},
	});
}
