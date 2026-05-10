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

const DEBUG_PREFIX = "[useSignFile]";
const debugLog = (step: string, data?: unknown) => {
	console.log(
		`${DEBUG_PREFIX} ${step}`,
		data ? JSON.stringify(data, null, 2) : "",
	);
};

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

			debugLog("MUTATION_START", { pieceCid, completedFieldIds, timestamp });

			if (!contracts || !wallet || !wasm.dilithium || !api) {
				debugLog("VALIDATION_FAILED", {
					hasContracts: !!contracts,
					hasWallet: !!wallet,
					hasWasm: !!wasm.dilithium,
					hasApi: !!api,
				});
				throw new Error("not connected");
			}
			debugLog("CONTEXT_VALID", { walletAddress: wallet.account.address });

			await cryptoAction(async (seed: Uint8Array) => {
				debugLog("CRYPTO_ACTION_START", { pieceCid, seedLength: seed.length });

				debugLog("FETCHING_FILE_INFO", { pieceCid });
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
					debugLog("FILE_INFO_FETCH_FAILED", { pieceCid });
					throw new Error("Failed to fetch file info");
				}
				debugLog("FILE_INFO_FETCHED", {
					pieceCid,
					sender: fileResponse.data.sender,
					status: fileResponse.data.status,
				});

				const {
					sender,
					placementCommitment,
					placementManifest: manifestRaw,
				} = fileResponse.data;

				debugLog("PARSING_MANIFEST");
				const manifest = zPlacementManifest.parse(manifestRaw);
				const signerAddr = getAddress(wallet.account.address);
				const placementCommitmentHex = placementCommitment as Hex;

				const assignedIds = manifest.fields
					.filter((f) => getAddress(f.assignedSigner) === signerAddr)
					.map((f) => f.id);
				debugLog("ASSIGNED_IDS_COMPUTED", {
					signerAddr,
					assignedCount: assignedIds.length,
					assignedIds,
				});

				let fieldIds: string[];
				if (completedFieldIds !== undefined) {
					const allowed = new Set(assignedIds);
					for (const id of completedFieldIds) {
						if (!allowed.has(id)) {
							debugLog("FIELD_ID_VALIDATION_FAILED", {
								id,
								allowedIds: Array.from(allowed),
							});
							throw new Error(
								"completedFieldIds must match manifest fields for signer",
							);
						}
					}
					fieldIds = completedFieldIds;
					debugLog("USING_COMPLETED_FIELD_IDS", {
						count: fieldIds.length,
						fieldIds,
					});
				} else {
					fieldIds = assignedIds;
					debugLog("USING_ALL_ASSIGNED_IDS", {
						count: fieldIds.length,
						fieldIds,
					});
				}

				if (fieldIds.length === 0) {
					debugLog("NO_FIELDS_ERROR");
					throw new Error("No fields assigned to this signer");
				}

				debugLog("COMPUTING_COMPLETIONS_ROOT");
				const completionsRoot = completionsMerkleRootV1({
					fieldIds,
					placementCommitment: placementCommitmentHex,
					pieceCid,
					signer: signerAddr,
				});
				debugLog("COMPLETIONS_ROOT_COMPUTED", { completionsRoot });

				const cidIdentifier = computeCidIdentifier(pieceCid);
				debugLog("CID_IDENTIFIER_COMPUTED", { cidIdentifier });

				debugLog("FETCHING_NONCE", { walletAddress: wallet.account.address });
				const nonce = await contracts.FSFileRegistry.read.nonce([
					wallet.account.address,
				]);
				debugLog("NONCE_FETCHED", { nonce: nonce.toString() });

				const dl3SignatureMessage = jsonStringify({
					pieceCid,
					sender,
					signer: wallet.account.address,
					timestamp,
					completionsRoot,
					leafSchemaVersion: LEAF_SCHEMA_VERSION_V1,
				});
				debugLog("DL3_MESSAGE_PREPARED", {
					messageLength: dl3SignatureMessage.length,
				});

				debugLog("GENERATING_DL3_KEYPAIR");
				const dl3Keypair = await signatures.keyGen({
					dl: wasm.dilithium,
					seed: seed,
				});
				debugLog("DL3_KEYPAIR_GENERATED", {
					publicKeyLength: dl3Keypair.publicKey.length,
				});

				debugLog("SIGNING_DL3_MESSAGE");
				const dl3Signature = await signatures.sign({
					dl: wasm.dilithium,
					privateKey: dl3Keypair.privateKey,
					message: textEncoder.encode(dl3SignatureMessage),
				});
				debugLog("DL3_SIGNATURE_CREATED", {
					signatureLength: dl3Signature.length,
				});

				const dl3SignatureCommitment = computeCommitment([toHex(dl3Signature)]);
				debugLog("DL3_COMMITMENT_COMPUTED", { dl3SignatureCommitment });

				debugLog("CREATING_EIP712_SIGNATURE");
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

				debugLog("SENDING_SIGN_REQUEST", {
					pieceCid,
					timestamp,
					hasCompletedFieldIds: completedFieldIds !== undefined,
				});
				const signResponse = await api.rpc.postSafe(
					{},
					`/files/${pieceCid}/sign`,
					{
						signature,
						timestamp: timestamp,
						dl3Signature: toHex(dl3Signature),
						...(completedFieldIds !== undefined ? { completedFieldIds } : {}),
					},
				);
				debugLog("SIGN_RESPONSE_RECEIVED", { success: signResponse.success });
				success = signResponse.success;
			});
			debugLog("CRYPTO_ACTION_COMPLETE", { success });

			return success;
		},
	});
}
