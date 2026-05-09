import { jsonStringify } from "@filosign/crypto-utils/node";
import type { Address, Hex } from "viem";
import type z from "zod";
import { zFileData } from "./helpers/zod";

function percentToHex(value: number) {
	if (value <= 0 || value >= 100)
		throw new RangeError("Must be between 0 and 100 (exclusive)");
	const encoded = Math.round((value / 100) * 0xfffff);
	return encoded.toString(16).padStart(5, "0");
}
function hexToPercent(hex: string) {
	const value = parseInt(hex, 16);
	return (value / 0xfffff) * 100;
}

export function encodeSignaturePosition(
	position: [number, number, number, number],
): Hex {
	return `0x${[
		percentToHex(position[0]),
		percentToHex(position[1]),
		percentToHex(position[2]),
		percentToHex(position[3]),
	].join("")}`;
}

export function decodeSignaturePosition(
	hex: Hex,
): [number, number, number, number] {
	const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
	if (cleanHex.length !== 20) {
		throw new Error("Invalid hex length for signature position");
	}
	return [
		hexToPercent(cleanHex.slice(0, 5)),
		hexToPercent(cleanHex.slice(5, 10)),
		hexToPercent(cleanHex.slice(10, 15)),
		hexToPercent(cleanHex.slice(15, 20)),
	];
}

export function base64ToUint8(base64: string): Uint8Array {
	const binary = atob(base64);
	const len = binary.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}
export function uint8ToBase64(uint8: Uint8Array): string {
	let binary = "";
	const len = uint8.byteLength;
	for (let i = 0; i < len; i++) {
		const v = uint8[i];
		if (v === undefined) continue;
		binary += String.fromCharCode(v);
	}
	return btoa(binary);
}

type FileData = z.infer<ReturnType<typeof zFileData>>;
export function encodeFileData(data: {
	bytes: Uint8Array;
	signers: {
		address: Address;
		signaturePosition: [number, number, number, number];
	}[];
	sender: Address;
	timestamp: number;
	metadata: FileData["metadata"];
}) {
	const encoder = new TextEncoder();
	const fileData: FileData = {
		bytesB64: uint8ToBase64(data.bytes),
		signers: data.signers.map((signer) => ({
			address: signer.address,
			signaturePosition: encodeSignaturePosition(signer.signaturePosition),
		})),
		sender: data.sender,
		timestamp: data.timestamp,
		metadata: data.metadata,
	};
	return encoder.encode(jsonStringify(fileData));
}
export async function decodeFileData(data: Uint8Array) {
	const decoder = new TextDecoder();
	const parsed = zFileData().parseAsync(JSON.parse(decoder.decode(data)));
	return parsed.then((p) => ({
		bytes: base64ToUint8(p.bytesB64),
		signers: p.signers.map((s) => ({
			address: s.address,
			signaturePosition: decodeSignaturePosition(s.signaturePosition as Hex),
		})),
		sender: p.sender,
		timestamp: p.timestamp,
		metadata: p.metadata,
	}));
}
