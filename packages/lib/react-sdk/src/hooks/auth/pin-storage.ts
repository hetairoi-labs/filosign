import { expandDeterministicSeed, toBytes } from "@filosign/crypto-utils";
import { entropyToMnemonic, mnemonicToEntropy, validateMnemonic } from "bip39";
import { idb } from "../../../utils/idb";

export const KEY_SEED_ENVELOPE_KEY = "key-seed-envelope-v1";
export const PIN_ATTEMPTS_KEY = "pin-attempts-v1";

const PIN_WRAP_INFO = toBytes("fs/pin-wrap-key/v1");
const DEFAULT_ARGON = {
	memory: 64 * 1024,
	time: 3,
	parallelism: 1,
	hashLen: 32,
};

function asBufferSource(
	bytes: Uint8Array<ArrayBufferLike>,
): Uint8Array<ArrayBuffer> {
	return new Uint8Array(Array.from(bytes));
}

export type PinEnvelope = {
	version: 1;
	ciphertext: Uint8Array;
	nonce: Uint8Array;
	argonSalt: Uint8Array;
	argonParams: {
		memory: number;
		time: number;
		parallelism: number;
		hashLen: number;
	};
	createdAt: number;
};

type AttemptState = {
	failed: number;
	lockUntil: number;
};

export function validatePin(pin: string) {
	return /^[0-9]{6,10}$/.test(pin);
}

async function hkdfSha256(
	source: Uint8Array,
	salt: Uint8Array,
	info: Uint8Array,
	length: number,
) {
	const key = await crypto.subtle.importKey(
		"raw",
		asBufferSource(source),
		"HKDF",
		false,
		["deriveBits"],
	);
	const bits = await crypto.subtle.deriveBits(
		{
			name: "HKDF",
			hash: "SHA-256",
			salt: asBufferSource(salt),
			info: asBufferSource(info),
		},
		key,
		length * 8,
	);
	return new Uint8Array(bits);
}

async function derivePinWrapKey(
	pin: string,
	argonSalt: Uint8Array,
	argonParams: PinEnvelope["argonParams"],
) {
	const argon2Module = (await import("argon2-browser")) as {
		default: {
			hash: (args: {
				pass: string;
				salt: Uint8Array<ArrayBuffer>;
				type: number;
				mem: number;
				time: number;
				parallelism: number;
				hashLen: number;
			}) => Promise<{ hash: Uint8Array }>;
			ArgonType: { Argon2id: number };
		};
	};
	const argon2 = argon2Module.default;
	const out = await argon2.hash({
		pass: pin,
		salt: asBufferSource(argonSalt),
		type: argon2.ArgonType.Argon2id,
		mem: argonParams.memory,
		time: argonParams.time,
		parallelism: argonParams.parallelism,
		hashLen: argonParams.hashLen,
	});
	return hkdfSha256(new Uint8Array(out.hash), argonSalt, PIN_WRAP_INFO, 32);
}

export async function encryptSeedWithPin(pin: string, seed: Uint8Array) {
	const argonSalt = crypto.getRandomValues(new Uint8Array(16));
	const nonce = crypto.getRandomValues(new Uint8Array(12));
	const wrapKey = await derivePinWrapKey(pin, argonSalt, DEFAULT_ARGON);
	const key = await crypto.subtle.importKey(
		"raw",
		asBufferSource(wrapKey),
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt"],
	);
	const encrypted = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: nonce },
		key,
		asBufferSource(seed),
	);
	return {
		version: 1 as const,
		ciphertext: new Uint8Array(encrypted),
		nonce,
		argonSalt,
		argonParams: DEFAULT_ARGON,
		createdAt: Date.now(),
	};
}

export async function decryptSeedWithPin(pin: string, envelope: PinEnvelope) {
	const wrapKey = await derivePinWrapKey(
		pin,
		envelope.argonSalt,
		envelope.argonParams,
	);
	const key = await crypto.subtle.importKey(
		"raw",
		asBufferSource(wrapKey),
		{ name: "AES-GCM", length: 256 },
		false,
		["decrypt"],
	);
	const decrypted = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: asBufferSource(envelope.nonce) },
		key,
		asBufferSource(envelope.ciphertext),
	);
	return new Uint8Array(decrypted);
}

export async function loadEnvelope(args: { wallet: string }) {
	const keyStore = idb({
		db: args.wallet,
		store: "fs-keystore",
	});
	const value = await keyStore.get<PinEnvelope>(KEY_SEED_ENVELOPE_KEY);
	return value;
}

export async function saveEnvelope(args: {
	wallet: string;
	envelope: PinEnvelope;
}) {
	const keyStore = idb({
		db: args.wallet,
		store: "fs-keystore",
	});
	await keyStore.put(KEY_SEED_ENVELOPE_KEY, args.envelope);
}

export async function clearEnvelope(args: { wallet: string }) {
	const keyStore = idb({
		db: args.wallet,
		store: "fs-keystore",
	});
	await keyStore.del(KEY_SEED_ENVELOPE_KEY);
}

export async function loadAttempts(args: { wallet: string }) {
	const keyStore = idb({
		db: args.wallet,
		store: "fs-keystore",
	});
	return (
		(await keyStore.get<AttemptState>(PIN_ATTEMPTS_KEY)) ?? {
			failed: 0,
			lockUntil: 0,
		}
	);
}

export async function resetAttempts(args: { wallet: string }) {
	const keyStore = idb({
		db: args.wallet,
		store: "fs-keystore",
	});
	await keyStore.put(PIN_ATTEMPTS_KEY, {
		failed: 0,
		lockUntil: 0,
	} satisfies AttemptState);
}

export async function registerFailedAttempt(args: { wallet: string }) {
	const keyStore = idb({
		db: args.wallet,
		store: "fs-keystore",
	});
	const current = (await keyStore.get<AttemptState>(PIN_ATTEMPTS_KEY)) ?? {
		failed: 0,
		lockUntil: 0,
	};
	const failed = current.failed + 1;
	const backoffMs = Math.min(2 ** Math.min(failed - 1, 6) * 1000, 60_000);
	const lockUntil =
		failed >= 10 ? Date.now() + 15 * 60_000 : Date.now() + backoffMs;
	const next = { failed, lockUntil } satisfies AttemptState;
	await keyStore.put(PIN_ATTEMPTS_KEY, next);
	return next;
}

export function assertAttemptAllowed(state: AttemptState) {
	if (state.lockUntil > Date.now()) {
		throw new Error("Account is temporarily locked. Please try again later.");
	}
}

export function recoveryPhraseFromSeed(seedCore32: Uint8Array) {
	const entropyHex = Array.from(seedCore32)
		.map((n) => n.toString(16).padStart(2, "0"))
		.join("");
	return entropyToMnemonic(entropyHex);
}

export async function seedFromRecoveryPhrase(phrase: string) {
	const normalized = phrase.trim().toLowerCase().replace(/\s+/g, " ");
	if (!validateMnemonic(normalized)) {
		throw new Error("Invalid recovery phrase");
	}
	const entropyHex = mnemonicToEntropy(normalized);
	const entropy = new Uint8Array(
		entropyHex.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [],
	);
	return expandDeterministicSeed(entropy);
}
