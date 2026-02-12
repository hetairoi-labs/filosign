import { computeCidIdentifier, eip712signature } from "@filosign/contracts";
import {
	computeSignersCommitment,
	encryption,
	KEM,
	randomBytes,
	toBytes,
	toHex,
} from "@filosign/crypto-utils";
import { encodeFileData } from "@filosign/shared";
import type { zFileData } from "@filosign/shared/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { calculatePieceCid } from "../../../utils/piece";
import { useFilosignContext } from "../../context/FilosignProvider";
import { useUserProfileByQuery } from "../users";

type FileData = z.infer<ReturnType<typeof zFileData>>;

export function useSendFile() {
	const { contracts, wallet, api } = useFilosignContext();
	const { data: user } = useUserProfileByQuery({
		address: wallet?.account.address,
	});

	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			signers: {
				address: Address;
				encryptionPublicKey: Hex;
				signaturePosition: [number, number, number, number];
			}[];
			viewers: { address: Address; encryptionPublicKey: string }[];
			bytes: Uint8Array;
			metadata: FileData["metadata"];
		}) => {
			const { signers, viewers, bytes, metadata } = args;
			const timestamp = Math.floor(Date.now() / 1000);

			console.log({ contracts, wallet, user });

			if (!contracts || !wallet || !user) {
				throw new Error("not conected iido");
			}

			const data = encodeFileData({
				bytes: bytes,
				sender: wallet.account.address,
				signers: signers,
				timestamp,
				metadata,
			});

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

			const signature = await eip712signature(contracts, "FSFileRegistry", {
				types: {
					RegisterFile: [
						{ name: "cidIdentifier", type: "bytes32" },
						{ name: "sender", type: "address" },
						{ name: "signersCommitment", type: "bytes20" },
						{ name: "timestamp", type: "uint256" },
						{ name: "nonce", type: "uint256" },
					],
				},
				primaryType: "RegisterFile",
				message: {
					cidIdentifier: cidIdentifier,
					sender: wallet.account.address,
					signersCommitment: computeSignersCommitment(
						signers.map((s) => getAddress(s.address)),
					),
					timestamp: BigInt(timestamp),
					nonce: BigInt(nonce),
				},
			});

			const requestPayload = {
				pieceCid: pieceCid.toString(),
				participants: participants,
				signature: signature,
				senderEncryptedEncryptionKey: toHex(selfEncryptedEncryptionKey),
				senderKemCiphertext: toHex(selfKemCiphertext),
				timestamp: timestamp,
			};

			const registerResponse = await api.rpc.postSafe(
				{},
				"/files",
				requestPayload,
			);

			queryClient.refetchQueries({ queryKey: ["sent-files"] });

			return registerResponse.success;
		},
	});
}
