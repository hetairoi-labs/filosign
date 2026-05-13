import { describe, expect, test } from "bun:test";
import {
	FILE_ACK_COLD_CLAIM_SENTINEL_V1,
	hashPrivySubjectCommitment,
} from "./privy-subject-commitment";

describe("hashPrivySubjectCommitment", () => {
	test("is deterministic for a given DID", () => {
		const did = "did:privy:clabc123";
		expect(hashPrivySubjectCommitment(did)).toBe(
			hashPrivySubjectCommitment(did),
		);
	});

	test("trims whitespace", () => {
		const did = "did:privy:x";
		expect(hashPrivySubjectCommitment(`  ${did}  `)).toBe(
			hashPrivySubjectCommitment(did),
		);
	});

	test("throws on empty", () => {
		expect(() => hashPrivySubjectCommitment("")).toThrow(
			"privyDid is required",
		);
	});
});

describe("FILE_ACK_COLD_CLAIM_SENTINEL_V1", () => {
	test("is a bytes32 hex", () => {
		expect(FILE_ACK_COLD_CLAIM_SENTINEL_V1).toMatch(/^0x[a-fA-F0-9]{64}$/);
	});
});
