import type { Account, Address, Hex, WalletClient } from "viem";
import { keccak256, toBytes } from "viem";

const ZERO_BYTES20 = "0x0000000000000000000000000000000000000000" as const;

export const SALT_PIN = `0x${"01".repeat(16)}` as Hex;
export const SALT_SEED = `0x${"02".repeat(16)}` as Hex;
export const SALT_CHALLENGE = `0x${"03".repeat(16)}` as Hex;
export const COMMIT_KYBER = `0x${"04".repeat(20)}` as Hex;
export const COMMIT_DILITHIUM = `0x${"05".repeat(20)}` as Hex;

export async function signRegisterKeygen(
	wallet: WalletClient,
	keyRegistryAddress: Address,
	chainId: number,
): Promise<Hex> {
	const account = wallet.account as Account;
	return wallet.signTypedData({
		account,
		domain: {
			name: "FSKeyRegistry",
			version: "1",
			chainId,
			verifyingContract: keyRegistryAddress,
		},
		types: {
			RegisterKeygenData: [
				{ name: "from", type: "address" },
				{ name: "salt_pin", type: "bytes16" },
				{ name: "salt_seed", type: "bytes16" },
				{ name: "salt_challenge", type: "bytes16" },
				{ name: "commitment_kyber_pk", type: "bytes20" },
				{ name: "commitment_dilithium_pk", type: "bytes20" },
			],
		},
		primaryType: "RegisterKeygenData",
		message: {
			from: account.address,
			salt_pin: SALT_PIN,
			salt_seed: SALT_SEED,
			salt_challenge: SALT_CHALLENGE,
			commitment_kyber_pk: COMMIT_KYBER,
			commitment_dilithium_pk: COMMIT_DILITHIUM,
		},
	});
}

export async function signRegisterFile(args: {
	wallet: WalletClient;
	fileRegistryAddress: Address;
	chainId: number;
	pieceCid: string;
	signersCommitment: Hex;
	viewersCommitment?: Hex;
	placementCommitment: Hex;
	senderEmailCommitment: Hex;
	senderPrivySubjectCommitment: Hex;
	timestamp: bigint;
	nonce: bigint;
}): Promise<Hex> {
	const account = args.wallet.account as Account;
	const cidId = keccak256(toBytes(args.pieceCid));
	const viewersCommitment = args.viewersCommitment ?? ZERO_BYTES20;

	return args.wallet.signTypedData({
		account,
		domain: {
			name: "FSFileRegistry",
			version: "1",
			chainId: args.chainId,
			verifyingContract: args.fileRegistryAddress,
		},
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
			cidIdentifier: cidId,
			sender: account.address,
			signersCommitment: args.signersCommitment,
			viewersCommitment,
			placementCommitment: args.placementCommitment,
			senderEmailCommitment: args.senderEmailCommitment,
			senderPrivySubjectCommitment: args.senderPrivySubjectCommitment,
			timestamp: args.timestamp,
			nonce: args.nonce,
		},
	});
}

export async function signRegisterFileSignature(args: {
	wallet: WalletClient;
	fileRegistryAddress: Address;
	chainId: number;
	pieceCid: string;
	sender: Address;
	signerEmailCommitment: Hex;
	privySubjectCommitment: Hex;
	dl3SignatureCommitment: Hex;
	completionsRoot: Hex;
	leafSchemaVersion: number;
	timestamp: bigint;
	nonce: bigint;
}): Promise<Hex> {
	const account = args.wallet.account as Account;
	const cidId = keccak256(toBytes(args.pieceCid));

	return args.wallet.signTypedData({
		account,
		domain: {
			name: "FSFileRegistry",
			version: "1",
			chainId: args.chainId,
			verifyingContract: args.fileRegistryAddress,
		},
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
			cidIdentifier: cidId,
			sender: args.sender,
			signerWallet: account.address,
			signerEmailCommitment: args.signerEmailCommitment,
			privySubjectCommitment: args.privySubjectCommitment,
			dl3SignatureCommitment: args.dl3SignatureCommitment,
			completionsRoot: args.completionsRoot,
			leafSchemaVersion: args.leafSchemaVersion,
			timestamp: args.timestamp,
			nonce: args.nonce,
		},
	});
}
