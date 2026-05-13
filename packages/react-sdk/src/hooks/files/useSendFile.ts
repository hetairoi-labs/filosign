import { computeCidIdentifier, eip712signature } from "@filosign/contracts";
import {
	encryption,
	generateColdInvitePhrase,
	KEM,
	randomBytes,
	toBytes,
	toHex,
	wrapColdInviteDek,
} from "@filosign/crypto-utils";
import {
	buildRegistrationEmailCommitments,
	computePlacementCommitment,
	encodeFileData,
	hashNormalizedSignerEmail,
	normalizePlacementRecipientEmail,
	type zFileData,
} from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address, Hex } from "viem";
import z from "zod";
import { calculatePieceCid } from "../../../utils/piece";
import { useFilosignContext } from "../../context/useFilosignContext";
import { useUserProfile } from "../users";

type FileData = z.infer<ReturnType<typeof zFileData>>;

export function useSendFile() {
	const { contracts, wallet, api } = useFilosignContext();
	const { data: user } = useUserProfile();

	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			signers: {
				address: Address;
				encryptionPublicKey: Hex;
			}[];
			viewers: { address: Address; encryptionPublicKey: string }[];
			bytes: Uint8Array;
			metadata: FileData["metadata"];
			placementManifest: FileData["placementManifest"];
			coldInvites?: { email: string; isSigner: boolean }[];
			/** Normalized viewer emails (non-signer recipients); must match server derivation. */
			viewerEmails: string[];
		}) => {
			const {
				signers,
				viewers,
				bytes,
				metadata,
				placementManifest,
				coldInvites,
				viewerEmails,
			} = args;
			const timestamp = Math.floor(Date.now() / 1000);

			if (!contracts || !wallet || !user) {
				throw new Error(
					"Not connected: contracts, wallet, and profile required",
				);
			}

			const rawSenderEmail = user.email?.trim();
			if (!rawSenderEmail) {
				throw new Error(
					"Add a primary email to your Filosign profile before sending documents",
				);
			}
			const senderEmailCommitment = hashNormalizedSignerEmail(
				normalizePlacementRecipientEmail(rawSenderEmail),
			);
			const senderPrivySubjectCommitment = user.privySubjectCommitment;
			if (!senderPrivySubjectCommitment?.trim()) {
				throw new Error(
					"Profile missing identity commitment; try signing out and back in.",
				);
			}

			const data = encodeFileData({
				bytes: bytes,
				sender: wallet.account.address,
				timestamp,
				metadata,
				placementManifest,
			});

			const placementCommitment = computePlacementCommitment(placementManifest);

			const encryptionKey = randomBytes(32);
			const encryptionInfo = "ignore-encryption-info";
			const encryptedData = await encryption.encrypt({
				message: data,
				secretKey: encryptionKey,
				info: encryptionInfo,
			});

			const pieceCid = calculatePieceCid(encryptedData);

			const viewedParticipants: Record<Address, boolean> = {};
			const participants: {
				address: Address;
				kemCiphertext: Hex;
				encryptedEncryptionKey: Hex;
				isSigner: boolean;
			}[] = [];

			const { ciphertext: selfKemCiphertext, sharedSecret: sKEM } =
				await KEM.encapsulate({
					publicKeyOther: toBytes(user.encryptionPublicKey),
				});
			const selfEncryptedEncryptionKey = await encryption.encrypt({
				message: encryptionKey,
				secretKey: sKEM,
				info: `${pieceCid.toString()}:${wallet.account.address}`,
			});
			viewedParticipants[wallet.account.address] = true;

			for (const signer of signers) {
				if (viewedParticipants[signer.address]) continue;
				viewedParticipants[signer.address] = true;

				const { ciphertext: recipientKemCiphertext, sharedSecret: ssKEM } =
					await KEM.encapsulate({
						publicKeyOther: toBytes(signer.encryptionPublicKey),
					});
				const recipientEncryptedEncryptionKey = await encryption.encrypt({
					message: encryptionKey,
					secretKey: ssKEM,
					info: `${pieceCid.toString()}:${signer.address}`,
				});

				participants.push({
					address: signer.address,
					kemCiphertext: toHex(recipientKemCiphertext),
					encryptedEncryptionKey: toHex(recipientEncryptedEncryptionKey),
					isSigner: true,
				});
			}
			for (const viewer of viewers) {
				if (viewedParticipants[viewer.address])
					throw new Error(`Duplicate viewer address ${viewer.address}`);
				viewedParticipants[viewer.address] = true;

				const { ciphertext: recipientKemCiphertext, sharedSecret: ssKEM } =
					await KEM.encapsulate({
						publicKeyOther: toBytes(viewer.encryptionPublicKey),
					});
				const recipientEncryptedEncryptionKey = await encryption.encrypt({
					message: encryptionKey,
					secretKey: ssKEM,
					info: `${pieceCid.toString()}:${viewer.address}`,
				});

				participants.push({
					address: viewer.address,
					kemCiphertext: toHex(recipientKemCiphertext),
					encryptedEncryptionKey: toHex(recipientEncryptedEncryptionKey),
					isSigner: false,
				});
			}

			const uploadStartResponse = await api.rpc.postSafe(
				{
					uploadUrl: z.string(),
				},
				"/files/upload/start",
				{
					pieceCid: pieceCid.toString(),
				},
			);

			const uploadResponse = await fetch(uploadStartResponse.data.uploadUrl, {
				method: "PUT",
				headers: {
					"Content-Type": "application/octet-stream",
				},
				body: encryptedData,
			});

			if (!uploadResponse.ok) {
				throw new Error(`Upload failed: ${uploadResponse.statusText}`);
			}

			const nonce = await contracts.FSFileRegistry.read.nonce([
				wallet.account.address,
			]);

			const cidIdentifier = computeCidIdentifier(pieceCid.toString());

			const { signersCommitment, viewersCommitment } =
				buildRegistrationEmailCommitments({
					placementManifest,
					viewerEmails,
				});

			const signature = await eip712signature(contracts, "FSFileRegistry", {
				types: {
					RegisterFile: [
						{ name: "cidIdentifier", type: "bytes32" },
						{ name: "sender", type: "address" },
						{ name: "signersCommitment", type: "bytes20" },
						{ name: "viewersCommitment", type: "bytes20" },
						{ name: "placementCommitment", type: "bytes32" },
						{ name: "senderEmailCommitment", type: "bytes32" },
						{ name: "senderPrivySubjectCommitment", type: "bytes32" },
						{ name: "timestamp", type: "uint256" },
						{ name: "nonce", type: "uint256" },
					],
				},
				primaryType: "RegisterFile",
				message: {
					cidIdentifier: cidIdentifier,
					sender: wallet.account.address,
					signersCommitment,
					viewersCommitment,
					placementCommitment,
					senderEmailCommitment,
					senderPrivySubjectCommitment,
					timestamp: BigInt(timestamp),
					nonce: BigInt(nonce),
				},
			});

			const coldInvitePairs =
				coldInvites?.length && pieceCid
					? await (async () => {
							const phrase = generateColdInvitePhrase();
							const inviteToken = toHex(randomBytes(32));
							const wrapped = toHex(
								await wrapColdInviteDek({
									encryptionKey,
									phrase,
								}),
							);
							return coldInvites.map((c) => ({
								row: {
									email: c.email.trim().toLowerCase(),
									inviteToken,
									wrappedEncryptionKey: wrapped,
									isSigner: c.isSigner,
								},
								phrase,
							}));
						})()
					: [];

			const coldInviteRows = coldInvitePairs.map((p) => p.row);
			const firstColdInvite = coldInvitePairs[0];
			const coldInviteShareCode = firstColdInvite
				? {
						phrase: firstColdInvite.phrase,
						inviteToken: firstColdInvite.row.inviteToken,
						emails: coldInviteRows.map((r) => r.email),
					}
				: undefined;

			const requestPayload = {
				pieceCid: pieceCid.toString(),
				participants: participants,
				signature: signature,
				senderEncryptedEncryptionKey: toHex(selfEncryptedEncryptionKey),
				senderKemCiphertext: toHex(selfKemCiphertext),
				timestamp: timestamp,
				placementCommitment,
				placementManifest,
				...(coldInviteRows.length > 0 ? { coldInvites: coldInviteRows } : {}),
			};

			const registerResponse = await api.rpc.postSafe(
				{},
				"/files",
				requestPayload,
			);

			queryClient.refetchQueries({ queryKey: ["sent-files"] });

			return {
				success: registerResponse.success,
				pieceCid: pieceCid.toString(),
				...(coldInviteShareCode ? { coldInviteShareCode } : {}),
			};
		},
	});
}
