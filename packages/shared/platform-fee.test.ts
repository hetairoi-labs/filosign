import { describe, expect, test } from "bun:test";
import { computePlatformFee, computeSignerNetPayout } from "./platform-fee";

describe("platform-fee", () => {
	test("zero bps returns full gross to signer", () => {
		expect(computePlatformFee(1_000_000n, 0)).toBe(0n);
		expect(computeSignerNetPayout(1_000_000n, 0)).toBe(1_000_000n);
	});

	test("100 bps is 1%", () => {
		expect(computePlatformFee(1_000_000n, 100)).toBe(10_000n);
		expect(computeSignerNetPayout(1_000_000n, 100)).toBe(990_000n);
	});
});
