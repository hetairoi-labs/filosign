import type { ComplianceBundle } from "@filosign/shared";
import {
	COMPLIANCE_CHAIN_TX_KINDS,
	LEAF_SCHEMA_VERSION_V1,
} from "@filosign/shared";

type ChainTxKind = (typeof COMPLIANCE_CHAIN_TX_KINDS)[number];

/** Line shape compatible with {@link CompliancePdfLine} in `compliance-pdf.ts`. */
export type ComplianceCopyLine = {
	text: string;
	linkUri?: string | null;
	display?: "hex-dump";
};

export function buildAboutThisRecordLines(
	bundle: ComplianceBundle,
	explorerNote: string,
	execPlain: string,
): ComplianceCopyLine[] {
	const scope =
		bundle.executionStatus === "fully_executed"
			? "This PDF is an export of a Filosign compliance bundle. It describes who participated, what was committed on-chain at export time, and the transactions Filosign associates with this file. The export reflects a single moment in time; it is not a live dashboard."
			: "This PDF is an export of a Filosign compliance bundle. It describes who participated, what was committed on-chain at export time, and the transactions Filosign associates with this file. Execution was not complete when the bundle was generated: at least one required signer had not yet recorded an on-chain signature. Treat status as historical, not current.";

	return [
		{ text: scope },
		{ text: "" },
		{ text: "How to use this record" },
		{
			text: "1. Bundle hash — Treat the bundle hash (in the key identifiers table) as the fingerprint of the canonical JSON snapshot. Any change to the JSON changes the hash.",
		},
		{
			text: "2. Transactions — Use the transaction index to locate each transaction hash on a block explorer for this chain. Compare block numbers, timestamps, and contract addresses to your own records.",
		},
		{
			text: "3. Registration snapshot — When present, the on-chain registration snapshot was read from FSFileRegistry at export time. You may reconcile those fields against the registration transaction and the same registry view on an archive node or explorer.",
		},
		{
			text: "4. Placements and Merkle data — Field placements and the placement manifest JSON underpin the placement commitment. The Merkle section lists per-signer completion roots and inclusion proofs so an independent party can recompute leaf hashes (see @filosign/shared) and verify roots.",
		},
		{ text: "" },
		{ text: explorerNote },
		{ text: "" },
		{ text: execPlain },
	];
}

export function buildTimestampExplainerLines(): ComplianceCopyLine[] {
	return [
		{
			text: "Timestamps in this record — Registration time on-chain follows the signed registration message. The block timestamp on a signature transaction reflects when that transaction was included. “Signed at” in the signer matrix matches the EIP-712 message time stored when the signature was submitted; it may differ slightly from block time.",
		},
	];
}

const TX_KIND_GLOSSARY: Record<ChainTxKind, string> = {
	file_registered:
		"Initial registration of the file’s commitments (placements, signers, viewers, sender bindings) on FSFileRegistry.",
	file_signed:
		"A signer’s signature recorded on-chain for this file (registry `registerFileSignature`).",
	sender_approved:
		"FSManager transaction where a recipient approved the sender relationship (`approveSender`), often after reviewing the file.",
	sender_revoked:
		"FSManager transaction revoking a prior sender approval for a recipient (relationship update).",
	incentive_attached:
		"FSManager transaction attaching an incentive configuration for the file (token and amount metadata in the bundle summary line).",
	incentives_released:
		"On-chain release of incentives where applicable; Filosign may surface this when log data is available on the receipt.",
};

export function buildAppendixLines(): ComplianceCopyLine[] {
	const lines: ComplianceCopyLine[] = [
		{ text: "Appendix A — Glossary (terms and verification)" },
		{ text: "" },
		{
			text: "Each entry states what the term means in Filosign and how a reviewer can use it. Technical values in the body of this PDF are authoritative; this appendix explains them.",
		},
		{ text: "" },
		{
			text: "Export ID — Stable identifier for this export in Filosign systems. Verify: correlate with your internal export or audit log entry.",
		},
		{
			text: "Bundle hash (SHA-256) — Cryptographic digest of the canonical JSON bundle. Verify: recompute SHA-256 over the canonical JSON (sorted keys as emitted by Filosign) and compare.",
		},
		{
			text: "Piece CID — Content identifier for the encrypted document payload Filosign stores. Verify: match to your storage or IPFS gateway records for the file.",
		},
		{
			text: "Placement commitment — `bytes32` commitment to the canonical placement manifest (field ids, types, positions, recipients). Verify: recompute from the manifest JSON printed in this PDF and compare to the commitment field.",
		},
		{
			text: "Placement manifest — JSON description of fields and normalized coordinates. Verify: canonical serialization must match the placement commitment algorithm in @filosign/shared.",
		},
		{
			text: "Registration transaction — Submitted by the sender to anchor the file on FSFileRegistry. Verify: open the tx on an explorer; check logs and state for the piece CID and commitments.",
		},
		{
			text: "Signers commitment / viewers commitment — Commitments to the ordered sets of signers and viewers. Verify: recompute from the party list and compare to on-chain registration fields when the snapshot is present.",
		},
		{
			text: "Sender email commitment / sender Privy subject commitment — Hides the sender’s email and login subject while binding them to the registration. Verify: compare to the sender row under Parties.",
		},
		{
			text: "emailCommitment (party or acknowledgement) — Hides a participant email while allowing Filosign to bind the same email across events. Verify: recomputed only with the preimage (Filosign internal); auditors typically check consistency across rows and txs.",
		},
		{
			text: "privySubjectCommitment — Hides the authentication subject identifier (not shown in raw form in the bundle). Verify: consistency across party rows and acknowledgements where present.",
		},
		{
			text: "cidIdentifier (on-chain) — Registry’s internal bytes32 key derived from the piece CID for lookups. Verify: compare to `cidIdentifier` RPC output for the same piece CID.",
		},
		{
			text: "signersCount / signaturesCount — Counts from `fileRegistrations` for required signers vs recorded signatures. Verify: compare to explorer contract state at the same block height when possible.",
		},
		{
			text: "registration timestamp (uint256) — Contract-stored registration time field as a decimal string from the bundle. Verify: read the same field from the registry view.",
		},
		{
			text: "Execution status — `fully_executed` or `partially_executed` from Filosign’s view of required fields vs on-chain signatures at export. Verify: cross-check the signer matrix against your business rules.",
		},
		{
			text: "approveSender transaction — FSManager approval tying a signer wallet to the sender for this flow. Verify: open the linked transaction and confirm event payloads and addresses.",
		},
		{
			text: `Merkle completions root — Root over per-field completion leaves (schema v${LEAF_SCHEMA_VERSION_V1}). Verify: recompute leaves with computeLeafHashV1 and Merkle combine per @filosign/shared; compare to the root printed for each signer.`,
		},
		{
			text: "Merkle siblings / leaf index — Standard Merkle inclusion proof material. Verify: walk the sibling list with the leaf hash to reproduce the root.",
		},
		{
			text: "Off-chain acknowledgement — EIP-712 acknowledgement captured without a chain transaction. Verify: validate the typed-data signature out-of-band against the wallet and commitments shown.",
		},
		{ text: "" },
		{ text: "Transaction kinds (index section)" },
		{ text: "" },
	];

	for (const kind of COMPLIANCE_CHAIN_TX_KINDS) {
		lines.push({
			text: `${kind} — ${TX_KIND_GLOSSARY[kind]}`,
		});
	}

	lines.push(
		{ text: "" },
		{ text: "Appendix B — JSON field map (bundle version 2)" },
		{ text: "" },
		{
			text: "Each path is relative to the root compliance bundle object. Values are reproduced in the body of this PDF.",
		},
		{ text: "" },
	);

	const rows: Array<[string, string]> = [
		["version", "Schema version; must be 2 for this layout."],
		["pieceCid", "Content id for the encrypted document payload."],
		["chainId", "EVM chain id for all on-chain references in the bundle."],
		["exportedAtIso", "UTC timestamp when Filosign finalized this bundle."],
		[
			"executionStatus",
			"Whether all required signers had on-chain signatures at export.",
		],
		["placementCommitment", "Commitment to the canonical placement manifest."],
		[
			"placementManifest",
			"Full manifest object (fields, geometry, recipients).",
		],
		["registration.sender", "Sender wallet recorded at registration."],
		[
			"registration.registrationTxHash",
			"Hash of the registry registration tx.",
		],
		["registration.createdAtIso", "Registration message time (UTC)."],
		["parties[]", "Sender, signers, and viewers with wallets and commitments."],
		["parties[].role", "sender | signer | viewer."],
		["parties[].wallet", "Checksummed participant address."],
		["parties[].email", "Plain email for human review (not commitment)."],
		["parties[].displayName", "Human-readable name when available."],
		["parties[].emailCommitment", "Commitment to normalized email."],
		[
			"parties[].privySubjectCommitment",
			"Commitment to auth subject when set.",
		],
		[
			"onchainRegistration",
			"Nullable ABI-shaped snapshot from FSFileRegistry at export.",
		],
		["onchainRegistration.cidIdentifier", "Registry key for the piece CID."],
		["onchainRegistration.sender", "On-chain sender address for the cid."],
		[
			"onchainRegistration.placementCommitment",
			"On-chain placement commitment.",
		],
		[
			"onchainRegistration.signersCommitment",
			"On-chain signers set commitment.",
		],
		[
			"onchainRegistration.viewersCommitment",
			"On-chain viewers set commitment.",
		],
		["onchainRegistration.senderEmailCommitment", "Sender email commitment."],
		[
			"onchainRegistration.senderPrivySubjectCommitment",
			"Sender auth-subject commitment.",
		],
		[
			"onchainRegistration.signersCount",
			"Required signer count from registry.",
		],
		[
			"onchainRegistration.signaturesCount",
			"Recorded signature count from registry.",
		],
		[
			"onchainRegistration.timestamp",
			"Registration timestamp field (uint256).",
		],
		["transactions[]", "Ordered list of related chain transactions."],
		["transactions[].kind", "Lifecycle label (see Appendix A tx kinds)."],
		["transactions[].txHash", "Transaction hash on this chain."],
		["transactions[].chainId", "Chain id (redundant with root chainId)."],
		["transactions[].contractAddress", "To-address of the call."],
		["transactions[].summary", "Human-readable one-line description."],
		["transactions[].relatedAddresses", "Addresses Filosign tags for the tx."],
		["transactions[].blockNumber", "Block number when known."],
		["transactions[].timestamp", "Block timestamp (unix seconds) when known."],
		["transactions[].fetchedAtIso", "When Filosign fetched receipt metadata."],
		["signers[]", "Per-signer compliance row aligned to the manifest."],
		["signers[].wallet", "Signer address."],
		["signers[].displayName", "Display name when known."],
		["signers[].email", "Signer email when known."],
		["signers[].signed", "Whether an on-chain signature exists."],
		["signers[].assignedFieldIds", "Fields assigned to this signer."],
		["signers[].requiredFieldIds", "Required fields for this signer."],
		["signers[].optionalFieldIds", "Optional fields for this signer."],
		["signers[].onchainTxHash", "Signature transaction hash when signed."],
		["signers[].signedAtIso", "EIP-712 message time when signed."],
		["signers[].completedFieldIds", "Fields completed when signing."],
		["signers[].completionsRoot", "Merkle root of completion leaves when set."],
		["signers[].leafSchemaVersion", "Leaf hash schema version when set."],
		["signers[].merkleProofs", "Inclusion proofs for completed fields."],
		["signers[].draftCompletedFieldIds", "Draft-only completions if unsigned."],
		[
			"signers[].messageTimestampIso",
			"Message timestamp from signing payload.",
		],
		[
			"signers[].blockTimestampFromTx",
			"Block time from the sign tx receipt when fetched.",
		],
		["signers[].approveSenderTxHash", "FSManager approval tx when present."],
		[
			"offChainEvidence.acknowledgements",
			"Typed acknowledgements without txs.",
		],
		[
			"offChainEvidence.acknowledgements[].wallet",
			"Signer wallet for the ack.",
		],
		[
			"offChainEvidence.acknowledgements[].createdAtIso",
			"Acknowledgement time.",
		],
		[
			"offChainEvidence.acknowledgements[].emailCommitment",
			"Email commitment inside the ack.",
		],
		[
			"offChainEvidence.acknowledgements[].privySubjectCommitment",
			"Subject commitment when present.",
		],
		["offChainEvidence.acknowledgements[].ackSha256", "Digest of ack payload."],
	];

	for (const [path, meaning] of rows) {
		lines.push({ text: `${path} — ${meaning}` });
	}

	return lines;
}
