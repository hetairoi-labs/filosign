import {
	encryption,
	generateColdInvitePhrase,
	KEM,
	toBytes,
	toHex,
	wrapColdInviteDek,
} from "@filosign/crypto-utils";
import { getAddress, type Hex } from "viem";
import { getSessionSeed } from "../hooks/auth/session-seed";

export type ColdInviteClaimKemArgs = {
	dek: Uint8Array;
	recipientEncryptionPk: Hex;
	pieceCid: string;
	recipientWalletAddress: string;
};

export type ColdInviteClaimKemPayload = {
	kemCiphertext: `0x${string}`;
	encryptedEncryptionKey: `0x${string}`;
};

export type RotatedColdInviteEnvelopeArgs = {
	pieceCid: string;
	walletAddress: `0x${string}`;
	kemCiphertext: Hex;
	encryptedEncryptionKey: Hex;
};

export type RotatedColdInviteEnvelopeResult = {
	phrase: string;
	inviteToken: `0x${string}`;
	wrappedEncryptionKey: `0x${string}`;
};

/** KEM encapsulate + AEAD encrypt DEK for `useClaimColdInvite` after cold decrypt. */
export async function buildClaimKemPayload(
	args: ColdInviteClaimKemArgs,
): Promise<ColdInviteClaimKemPayload> {
	const recipientWallet = getAddress(args.recipientWalletAddress);
	const { ciphertext: kemCiphertext, sharedSecret } = await KEM.encapsulate({
		publicKeyOther: toBytes(args.recipientEncryptionPk),
	});
	const encryptedEncryptionKey = await encryption.encrypt({
		message: args.dek,
		secretKey: sharedSecret,
		info: `${args.pieceCid}:${recipientWallet}`,
	});
	return {
		kemCiphertext: toHex(kemCiphertext),
		encryptedEncryptionKey: toHex(encryptedEncryptionKey),
	};
}

/** Decrypt wallet-bound envelope, Argon2-wrap DEK for `useRegenerateColdInvite`. */
export async function buildRotatedInviteEnvelope(
	args: RotatedColdInviteEnvelopeArgs,
): Promise<RotatedColdInviteEnvelopeResult> {
	const keySeed = getSessionSeed(args.walletAddress);
	if (!keySeed) {
		throw new Error("Please unlock your wallet first");
	}
	const phrase = generateColdInvitePhrase();
	const inviteToken = `0x${Array.from(
		crypto.getRandomValues(new Uint8Array(32)),
	)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")}` as `0x${string}`;

	const { privateKey } = await KEM.keyGen({
		seed: new Uint8Array(Array.from(keySeed)),
	});

	const wallet = getAddress(args.walletAddress);
	const { sharedSecret: ssE } = await KEM.decapsulate({
		ciphertext: toBytes(args.kemCiphertext),
		privateKeySelf: privateKey,
	});

	const dek = await encryption.decrypt({
		ciphertext: toBytes(args.encryptedEncryptionKey),
		secretKey: ssE,
		info: `${args.pieceCid}:${wallet}`,
	});

	const wrapped = await wrapColdInviteDek({
		encryptionKey: dek,
		phrase,
	});

	const wrappedEncryptionKey = `0x${Array.from(wrapped)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")}` as `0x${string}`;

	return {
		phrase,
		inviteToken,
		wrappedEncryptionKey,
	};
}
