import { expandDeterministicSeed } from "@filosign/crypto-utils";
import { entropyToMnemonic, mnemonicToEntropy, validateMnemonic } from "bip39";

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
