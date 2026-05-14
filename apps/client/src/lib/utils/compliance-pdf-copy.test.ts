import { describe, expect, test } from "bun:test";
import { COMPLIANCE_CHAIN_TX_KINDS } from "@filosign/shared";
import { buildAppendixLines } from "./compliance-pdf-copy";

describe("compliance-pdf-copy", () => {
	test("appendix mentions every chain tx kind", () => {
		const text = buildAppendixLines()
			.map((l) => l.text)
			.join("\n");
		for (const k of COMPLIANCE_CHAIN_TX_KINDS) {
			expect(text).toContain(k);
		}
	});
});
