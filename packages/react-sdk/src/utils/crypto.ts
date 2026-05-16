import { type Hex, ripemd160 } from "viem";

export function getRipemd160HashBrowser(data: string): string {
	const encoder = new TextEncoder();
	const dataBytes = encoder.encode(data);
	const hashHex = ripemd160(dataBytes);
	return hashHex;
}

export function compressPublicKey(publicKey: Hex): Hex {
	if (!publicKey.startsWith("0x04")) {
		throw new Error("Expected uncompressed public key starting with 0x04");
	}

	return `0x${publicKey.slice(4, 68)}` as Hex;
}
