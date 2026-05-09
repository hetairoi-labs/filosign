import fjsStringify from "fast-json-stable-stringify";
import {
	type Account,
	type Address,
	type Chain,
	encodePacked,
	getAddress,
	type Hex,
	isAddress,
	ripemd160,
	type Transport,
	toBytes,
	toHex,
	type WalletClient,
} from "viem";
import * as KEM from "./KEM";
import * as signatures from "./signatures";

export { toBytes, toHex };

export function randomBytes(n = 32) {
	return crypto.getRandomValues(new Uint8Array(n));
}

export function randomHex(n = 32) {
	const bytes = randomBytes(n);
	return toHex(bytes);
}

const REGISTER_CHALLENGE_INFO = "filosign-keygen-v2";
const KEY_SEED_CORE_INFO = "fs-key-seed-core-v2";
const KEY_SEED_EXPAND_INFO = "fs-key-seed-expand-v1";

export async function hkdfExtractExpand(
	source: Uint8Array,
	salt: Uint8Array | null,
	info: Uint8Array | null,
	length: number,
): Promise<Uint8Array> {
	const subtle = crypto.subtle;
	const hkdfKey = await subtle.importKey(
		"raw",
		source as BufferSource,
		"HKDF",
		false,
		["deriveBits"],
	);
	const derivedBits = await subtle.deriveBits(
		{
			name: "HKDF",
			hash: "SHA-256",
			salt: (salt ?? new Uint8Array([])) as BufferSource,
			info: (info ?? new Uint8Array([])) as BufferSource,
		},
		hkdfKey,
		length * 8,
	);
	return new Uint8Array(derivedBits);
}

export function generateRegisterChallenge(
	userAddress: Address,
	salt: Hex,
	info: string,
) {
	const challenge = `filosign:${userAddress}:${salt}:${info}`;
	return challenge;
}

export function computeSignersCommitment(signers: Address[]) {
	const sortedSigners = signers.map((s) => getAddress(s)).sort();
	return ripemd160(encodePacked(["address[]"], [sortedSigners]));
}

export function computeCommitment(
	args: (string | number | bigint)[] | readonly (string | number | bigint)[],
) {
	function determineType(
		value: string | number | bigint,
	): "string" | "uint256" | "address" {
		if (typeof value === "string" && isAddress(value)) {
			return "address";
		}
		if (typeof value === "string") {
			return "string";
		}
		if (typeof value === "number") {
			return "uint256";
		}
		if (typeof value === "bigint") {
			return "uint256";
		}
		throw new Error("Unsupported type");
	}

	const types = args.map((i) => determineType(i));
	//@ts-expect-error <- this is very important here and I don't think there is a way to fix this
	return ripemd160(encodePacked(types, args));
}

export async function walletKeyGen(
	wallet: Wallet,
	args: {
		dl: signatures.DL;
		salts?: {
			challenge: Hex;
			seed: Hex;
			pin: Hex;
		};
	},
) {
	const { salts, dl } = args;
	const saltPin = salts?.pin ? toBytes(salts.pin) : randomBytes(16);
	const saltSeed = salts?.seed ? toBytes(salts.seed) : randomBytes(16);
	const saltChallenge = salts?.challenge
		? toBytes(salts.challenge)
		: randomBytes(16);

	const seedCore32 = await deriveDeterministicSeed32(wallet, {
		saltChallenge: toHex(saltChallenge),
		saltSeed: toHex(saltSeed),
	});
	const seed = await expandDeterministicSeed(seedCore32);

	const kemKeypair = await KEM.keyGen({ seed });
	const sigKeypair = await signatures.keyGen({ seed, dl });

	const commitmentKem = computeCommitment([kemKeypair.publicKey.toString()]);
	const commitmentSig = computeCommitment([sigKeypair.publicKey.toString()]);

	return {
		seed,
		seedCore32,
		saltPin: toHex(saltPin),
		saltSeed: toHex(saltSeed),
		saltChallenge: toHex(saltChallenge),
		kemKeypair,
		sigKeypair,
		commitmentKem,
		commitmentSig,
	};
}

export async function deriveDeterministicSeed32(
	wallet: Wallet,
	args: {
		saltChallenge: Hex;
		saltSeed: Hex;
	},
) {
	const registerChallenge = generateRegisterChallenge(
		wallet.account.address,
		args.saltChallenge,
		REGISTER_CHALLENGE_INFO,
	);
	const signature = await wallet.signMessage({
		message: registerChallenge,
	});
	return deriveDeterministicSeed32FromSignature({
		signature,
		saltSeed: args.saltSeed,
	});
}

export async function deriveDeterministicSeed32FromSignature(args: {
	signature: Hex;
	saltSeed: Hex;
}) {
	return hkdfExtractExpand(
		toBytes(args.signature),
		toBytes(args.saltSeed),
		toBytes(KEY_SEED_CORE_INFO),
		32,
	);
}

export async function expandDeterministicSeed(seedCore32: Uint8Array) {
	return hkdfExtractExpand(
		seedCore32,
		seedCore32,
		toBytes(KEY_SEED_EXPAND_INFO),
		64,
	);
}

export async function seedKeyGen(
	seed: Uint8Array<ArrayBuffer>,
	args: { dl: signatures.DL },
) {
	const kemKeypair = await KEM.keyGen({ seed });
	const sigKeypair = await signatures.keyGen({ seed, dl: args.dl });

	const commitmentKem = computeCommitment([kemKeypair.publicKey.toString()]);
	const commitmentSig = computeCommitment([sigKeypair.publicKey.toString()]);

	return {
		kemKeypair,
		sigKeypair,
		commitmentKem,
		commitmentSig,
	};
}

function stringifyReplacer(_: string, value: unknown) {
	if (typeof value === "bigint") {
		const asNumber = Number(value);
		if (BigInt(asNumber) === value) return asNumber;
		return value.toString();
	}
	if (value instanceof Uint8Array) {
		// Convert Uint8Array to base64 string to reduce JSON size
		if (typeof Buffer !== "undefined") {
			return {
				__type: "Uint8Array",
				data: Buffer.from(value).toString("base64"),
			};
		} else {
			let binary = "";
			for (let i = 0; i < value.length; i++) {
				const v = value[i];
				if (!v) continue;
				binary += String.fromCharCode(v);
			}
			return { __type: "Uint8Array", data: btoa(binary) };
		}
	}
	return value;
}

function parseReviver(_: string, value: unknown) {
	if (
		value &&
		typeof value === "object" &&
		"__type" in value &&
		value.__type === "Uint8Array" &&
		"data" in value &&
		typeof value.data === "string"
	) {
		// Convert base64 string back to Uint8Array
		if (typeof Buffer !== "undefined") {
			return new Uint8Array(Buffer.from(value.data, "base64"));
		} else {
			const binary = atob(value.data);
			const bytes = new Uint8Array(binary.length);
			for (let i = 0; i < binary.length; i++) {
				bytes[i] = binary.charCodeAt(i);
			}
			return bytes;
		}
	}
	return value;
}

export const jsonStringify = (obj: unknown): string =>
	fjsStringify(JSON.parse(JSON.stringify(obj, stringifyReplacer)));

export const jsonParse = (str: string): unknown =>
	JSON.parse(str, parseReviver);

export const jsonClone = <T>(obj: T): T => {
	return jsonParse(jsonStringify(obj)) as T;
};

export type Wallet = WalletClient<Transport, Chain, Account>;
