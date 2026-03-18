import { computeCidIdentifier, eip712signature } from "@filosign/contracts";
import {
	computeCommitment,
	jsonStringify,
	signatures,
	toHex,
} from "@filosign/crypto-utils";
import { useMutation } from "@tanstack/react-query";
import z from "zod";
import { useFilosignContext } from "../../context/FilosignProvider";
import { useCryptoSeed } from "../auth";

export function useSignFile() {
	const { contracts, wallet, api, wasm } = useFilosignContext();
	const { action: cryptoAction } = useCryptoSeed();

	return useMutation({
		mutationFn: async (args: { pieceCid: string }) => {
			let success = false;

			const { pieceCid } = args;
			const timestamp = Math.floor(Date.now() / 1000);
			const textEncoder = new TextEncoder();

			if (!contracts || !wallet || !wasm.dilithium) {
				throw new Error("not connected");
			}

			await cryptoAction(async (seed: Uint8Array) => {
				const fileResponse = await api.rpc.getSafe(
					{
						pieceCid: z.string(),
						sender: z.string(),
						status: z.string(),
						createdAt: z.string(),
						signers: z.array(z.string()),
						viewers: z.array(z.string()),
					},
					`/files/${pieceCid}`,
				);

				if (!fileResponse.success) {
					throw new Error("Failed to fetch file info");
				}

				const { sender } = fileResponse.data;

				const cidIdentifier = computeCidIdentifier(pieceCid);

				const nonce = await contracts.FSFileRegistry.read.nonce([
					wallet.account.address,
				]);

				const dl3SignatureMessage = jsonStringify({
					pieceCid,
					sender,
					signer: wallet.account.address,
					timestamp: timestamp,
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
						timestamp: BigInt(timestamp),
						nonce: BigInt(nonce),
					},
				});

				const signResponse = await api.rpc.postSafe(
					{},
					`/files/${pieceCid}/sign`,
					{
						signature,
						timestamp: timestamp,
						dl3Signature: toHex(dl3Signature),
					},
				);

				success = signResponse.success;
			});

			return success;
		},
	});
}
