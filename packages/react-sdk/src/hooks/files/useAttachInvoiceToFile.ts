import { useMutation } from "@tanstack/react-query";
import {
	type Address,
	createPublicClient,
	erc20Abi,
	type Hex,
	hexToSignature,
	http,
} from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

const PERMIT_DEADLINE_BUFFER = 20 * 60; // seconds

const ERC20_NONCES_ABI = [
	{
		inputs: [{ internalType: "address", name: "owner", type: "address" }],
		name: "nonces",
		outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
		stateMutability: "view",
		type: "function",
	},
] as const;

const ERC20_NAME_ABI = [
	{
		inputs: [],
		name: "name",
		outputs: [{ internalType: "string", name: "", type: "string" }],
		stateMutability: "view",
		type: "function",
	},
] as const;

const ERC20_VERSION_ABI = [
	{
		inputs: [],
		name: "version",
		outputs: [{ internalType: "string", name: "", type: "string" }],
		stateMutability: "view",
		type: "function",
	},
] as const;

export type AttachInvoiceArgs = {
	pieceCid: string;
	/** `keccak256("filosign:signer-email:v1:" || normalized email)` */
	signerEmailCommitment: Hex;
	token: Address;
	amount: bigint;
	memo: string;
};

export function useAttachInvoiceToFile() {
	const { contracts, wallet } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async (args: AttachInvoiceArgs) => {
			const { pieceCid, signerEmailCommitment, token, amount, memo } = args;

			if (!contracts || !wallet || !isAuthed) {
				throw new Error("not connected");
			}

			const publicClient = createPublicClient({
				chain: wallet.chain,
				transport: http(wallet.chain?.rpcUrls.default.http[0]),
			});

			let supportsPermit = false;
			try {
				await publicClient.readContract({
					address: token,
					abi: ERC20_NONCES_ABI,
					functionName: "nonces",
					args: [wallet.account.address],
				});
				supportsPermit = true;
			} catch {
				supportsPermit = false;
			}

			if (supportsPermit) {
				const escrowAddress = (await publicClient.readContract({
					address: contracts.FSManager.address,
					abi: contracts.FSManager.abi,
					functionName: "escrow",
				})) as Address;

				const [nonce, tokenName] = await Promise.all([
					publicClient.readContract({
						address: token,
						abi: ERC20_NONCES_ABI,
						functionName: "nonces",
						args: [wallet.account.address],
					}),
					publicClient.readContract({
						address: token,
						abi: ERC20_NAME_ABI,
						functionName: "name",
					}),
				]);

				const deadline = BigInt(
					Math.floor(Date.now() / 1000) + PERMIT_DEADLINE_BUFFER,
				);

				let domainVersion = "1";
				try {
					domainVersion = await publicClient.readContract({
						address: token,
						abi: ERC20_VERSION_ABI,
						functionName: "version",
					});
				} catch {
					// keep "1"
				}

				const permitSig = await wallet.signTypedData({
					account: wallet.account,
					domain: {
						name: tokenName,
						version: domainVersion,
						chainId: wallet.chain.id,
						verifyingContract: token,
					},
					types: {
						Permit: [
							{ name: "owner", type: "address" },
							{ name: "spender", type: "address" },
							{ name: "value", type: "uint256" },
							{ name: "nonce", type: "uint256" },
							{ name: "deadline", type: "uint256" },
						],
					},
					primaryType: "Permit",
					message: {
						owner: wallet.account.address,
						spender: escrowAddress,
						value: amount,
						nonce,
						deadline,
					},
				});

				const { v, r, s } = hexToSignature(permitSig);

				return rpcQuery.files.piece.incentive.call({
					pieceCid,
					body: {
						signerEmailCommitment,
						memo,
						token,
						amount: amount.toString(),
						usePermit: true,
						deadline: deadline.toString(),
						v: Number(v),
						r,
						s,
					},
				});
			} else {
				const escrowAddress = (await publicClient.readContract({
					address: contracts.FSManager.address,
					abi: contracts.FSManager.abi,
					functionName: "escrow",
				})) as Address;

				const allowance = await publicClient.readContract({
					address: token,
					abi: erc20Abi,
					functionName: "allowance",
					args: [wallet.account.address, escrowAddress],
				});

				if (allowance < amount) {
					const approveTxHash = await wallet.writeContract({
						address: token,
						abi: erc20Abi,
						functionName: "approve",
						args: [escrowAddress, amount],
						chain: wallet.chain,
						account: wallet.account,
					});
					await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
				}

				return rpcQuery.files.piece.incentive.call({
					pieceCid,
					body: {
						signerEmailCommitment,
						memo,
						token,
						amount: amount.toString(),
						usePermit: false,
					},
				});
			}
		},
	});
}
