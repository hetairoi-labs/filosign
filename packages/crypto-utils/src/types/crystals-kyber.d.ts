declare module "crystals-kyber" {
	export function KeyGen1024(): [ArrayBuffer, ArrayBuffer];
	export function Encrypt1024(
		publicKey: Uint8Array | ArrayBuffer,
	): [ArrayBuffer, ArrayBuffer];
	export function Decrypt1024(
		ciphertext: Uint8Array | ArrayBuffer,
		secretKey: Uint8Array | ArrayBuffer,
	): ArrayBuffer;

	const kyber: {
		KeyGen1024(): [ArrayBuffer, ArrayBuffer];
		Encrypt1024(
			publicKey: Uint8Array | ArrayBuffer,
		): [ArrayBuffer, ArrayBuffer];
		Decrypt1024(
			ciphertext: Uint8Array | ArrayBuffer,
			secretKey: Uint8Array | ArrayBuffer,
		): ArrayBuffer;
	};

	export default kyber;
}
