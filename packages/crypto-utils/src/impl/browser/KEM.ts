import { MlKem1024 as KEM } from "mlkem";

export async function keyGen(args: { seed: Uint8Array }) {
	const { seed } = args;
	const kyber = new KEM();

	if (seed.length !== 64) {
		throw new Error("Seed must be 64 bytes long");
	}

	const [kPub, kPvt] = await kyber.deriveKeyPair(seed);

	return {
		publicKey: new Uint8Array(kPub),
		privateKey: new Uint8Array(kPvt),
	};
}

export async function encapsulate(args: { publicKeyOther: Uint8Array }) {
	const { publicKeyOther } = args;
	const kyber = new KEM();

	const [ciphertext, sharedSecret] = await kyber.encap(publicKeyOther);

	return {
		ciphertext: new Uint8Array(ciphertext),
		sharedSecret: new Uint8Array(sharedSecret),
	};
}

export async function decapsulate(args: {
	ciphertext: Uint8Array;
	privateKeySelf: Uint8Array;
}) {
	const { ciphertext, privateKeySelf } = args;
	const kyber = new KEM();

	const sharedSecret = await kyber.decap(ciphertext, privateKeySelf);
	return { sharedSecret: new Uint8Array(sharedSecret) };
}
