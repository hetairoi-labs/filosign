import type Dilithium from "dilithium-crystals-js";
import { DILITHIUM_KIND } from "../../constants";
import * as fsHash from "../node/hash";
import { toBytes } from "../node/utils";

const dilithiumKind = DILITHIUM_KIND;
type DL = Awaited<typeof Dilithium>;

export async function keyGen(args: { seed: Uint8Array; dl: DL }) {
	const { seed, dl } = args;

	const pair = dl.generateKeys(dilithiumKind, seed);

	if (!pair || !pair.publicKey || !pair.privateKey) {
		throw new Error("Key generation failed");
	}

	return {
		publicKey: new Uint8Array(pair.publicKey),
		privateKey: new Uint8Array(pair.privateKey),
	};
}

export async function sign(args: {
	dl: DL;
	message: Uint8Array;
	privateKey: Uint8Array;
}) {
	const { message, privateKey, dl } = args;

	const { signature } = dl.sign(
		toBytes(fsHash.digest(message)),
		privateKey,
		dilithiumKind,
	);
	if (!signature) {
		throw new Error("Signing failed");
	}
	return new Uint8Array(signature);
}

export async function verify(args: {
	dl: DL;
	message: Uint8Array;
	signature: Uint8Array;
	publicKey: Uint8Array;
}) {
	const { message, signature, publicKey, dl } = args;

	const { result } = dl.verify(
		signature,
		toBytes(fsHash.digest(message)),
		publicKey,
		dilithiumKind,
	);

	return result === 0;
}
