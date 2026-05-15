import { describe, expect, it } from "bun:test";
import {
	recoveryPhraseFromSeed,
	seedFromRecoveryPhrase,
} from "./recovery-phrase";

describe("recovery-phrase", () => {
	it("round-trips seed core to mnemonic and back to expanded seed", async () => {
		const core = crypto.getRandomValues(new Uint8Array(32));
		const phrase = recoveryPhraseFromSeed(core);
		const expanded = await seedFromRecoveryPhrase(phrase);
		const again = await seedFromRecoveryPhrase(phrase);
		expect(expanded.length).toBeGreaterThan(0);
		let same = expanded.length === again.length;
		if (same) {
			for (let i = 0; i < expanded.length; i++) {
				if (expanded[i] !== again[i]) {
					same = false;
					break;
				}
			}
		}
		expect(same).toBe(true);
	});
});
