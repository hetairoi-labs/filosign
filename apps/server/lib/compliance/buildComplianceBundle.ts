import { createHash } from "node:crypto";
import type { ComplianceBundleV1 } from "@filosign/shared";
import {
	canonicalComplianceBundleJson,
	completionsMerkleProofsV1,
	fieldIdsForSigner,
	requiredFieldIdsForSigner,
	zComplianceBundleV1,
	zPlacementManifest,
} from "@filosign/shared";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import config from "@/config";
import type db from "@/lib/db";
import {
	complianceExportLogs,
	fileSignatures,
	fileSignerDrafts,
	files,
} from "@/lib/db/schema/file";

function sha256HexUtf8(s: string): `0x${string}` {
	const hex = createHash("sha256").update(s, "utf8").digest("hex");
	return `0x${hex}` as `0x${string}`;
}

type ParticipantRow = {
	wallet: Address;
	role: "sender" | "viewer" | "signer";
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	username: string | null;
};

export async function buildComplianceBundleAndHash(args: {
	db: typeof db;
	pieceCid: string;
	participantRows: ParticipantRow[];
}): Promise<{
	bundle: ComplianceBundleV1;
	bundleHash: `0x${string}`;
}> {
	const { db: database, pieceCid, participantRows } = args;

	const [fileRecord] = await database
		.select({
			sender: files.sender,
			onchainTxHash: files.onchainTxHash,
			createdAt: files.createdAt,
			placementCommitment: files.placementCommitment,
			placementManifestJson: files.placementManifestJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	if (!fileRecord) {
		throw new Error("File not found");
	}

	const manifestParsed = zPlacementManifest.safeParse(
		fileRecord.placementManifestJson,
	);
	if (!manifestParsed.success) {
		throw new Error("Invalid placement manifest on file record");
	}
	const manifest = manifestParsed.data;

	const sigRows = await database
		.select({
			signer: fileSignatures.signer,
			onchainTxHash: fileSignatures.onchainTxHash,
			createdAt: fileSignatures.createdAt,
			completedFieldIds: fileSignatures.completedFieldIds,
			completionsRoot: fileSignatures.completionsRoot,
			leafSchemaVersion: fileSignatures.leafSchemaVersion,
		})
		.from(fileSignatures)
		.where(eq(fileSignatures.filePieceCid, pieceCid));

	const draftRows = await database
		.select({
			wallet: fileSignerDrafts.wallet,
			completedFieldIds: fileSignerDrafts.completedFieldIds,
		})
		.from(fileSignerDrafts)
		.where(eq(fileSignerDrafts.filePieceCid, pieceCid));

	const draftByWallet = new Map(
		draftRows.map((d) => [
			getAddress(d.wallet).toLowerCase(),
			d.completedFieldIds,
		]),
	);

	const sigByWallet = new Map(
		sigRows.map((s) => [getAddress(s.signer).toLowerCase(), s]),
	);

	const signerParticipants = participantRows.filter((p) => p.role === "signer");
	const totalSigners = signerParticipants.length;
	const signedCount = signerParticipants.filter((p) =>
		sigByWallet.has(getAddress(p.wallet).toLowerCase()),
	).length;

	const executionStatus =
		totalSigners > 0 && signedCount === totalSigners
			? ("fully_executed" as const)
			: ("partially_executed" as const);

	const exportedAtIso = new Date().toISOString();

	const signers: ComplianceBundleV1["signers"] = signerParticipants.map((p) => {
		const wallet = getAddress(p.wallet);
		const walletKey = wallet.toLowerCase();
		const displayName =
			[p.firstName, p.lastName].filter(Boolean).join(" ") || p.username || null;

		const assigned = fieldIdsForSigner(manifest, wallet);
		const assignedFieldIds = assigned.map((f) => f.id);
		const reqIds = requiredFieldIdsForSigner(manifest, wallet);
		const reqSet = new Set(reqIds);
		const optionalFieldIds = assignedFieldIds.filter((id) => !reqSet.has(id));

		const sig = sigByWallet.get(walletKey);
		const draftIds = draftByWallet.get(walletKey) ?? [];

		if (sig) {
			const completedFieldIds = sig.completedFieldIds;
			const merkleProofs = completionsMerkleProofsV1({
				fieldIds: completedFieldIds,
				placementCommitment: fileRecord.placementCommitment,
				pieceCid,
				signer: wallet,
			}).map((pr) => ({
				fieldId: pr.fieldId,
				leafHash: pr.leafHash,
				leafIndex: pr.leafIndex,
				siblings: pr.siblings,
			}));

			return {
				wallet,
				displayName,
				email: p.email,
				signed: true,
				assignedFieldIds,
				requiredFieldIds: reqIds,
				optionalFieldIds,
				onchainTxHash: sig.onchainTxHash as `0x${string}`,
				signedAtIso: sig.createdAt.toISOString(),
				completedFieldIds,
				completionsRoot: sig.completionsRoot,
				leafSchemaVersion: sig.leafSchemaVersion,
				merkleProofs,
				draftCompletedFieldIds: [] as string[],
			};
		}

		return {
			wallet,
			displayName,
			email: p.email,
			signed: false,
			assignedFieldIds,
			requiredFieldIds: reqIds,
			optionalFieldIds,
			onchainTxHash: null,
			signedAtIso: null,
			completedFieldIds: [] as string[],
			completionsRoot: null,
			leafSchemaVersion: null,
			merkleProofs: [] as ComplianceBundleV1["signers"][number]["merkleProofs"],
			draftCompletedFieldIds: draftIds.filter((id) =>
				assignedFieldIds.includes(id),
			),
		};
	});

	const raw: ComplianceBundleV1 = {
		version: 1,
		pieceCid,
		chainId: config.runtimeChain.id,
		exportedAtIso,
		executionStatus,
		placementCommitment: fileRecord.placementCommitment,
		placementManifest: manifest,
		registration: {
			sender: getAddress(fileRecord.sender),
			registrationTxHash: fileRecord.onchainTxHash,
			createdAtIso: fileRecord.createdAt.toISOString(),
		},
		signers,
	};

	const bundle = zComplianceBundleV1.parse(raw);
	const bundleHash = sha256HexUtf8(canonicalComplianceBundleJson(bundle));

	return { bundle, bundleHash };
}

export async function insertComplianceExportLog(args: {
	db: typeof db;
	pieceCid: string;
	requestedBy: Address;
	bundle: ComplianceBundleV1;
	bundleHash: `0x${string}`;
	documentSha256?: string | undefined;
	requestUserAgent?: string | null;
	requestIp?: string | null;
}): Promise<{ exportId: string }> {
	const {
		db: database,
		pieceCid,
		requestedBy,
		bundle,
		bundleHash,
		documentSha256,
		requestUserAgent,
		requestIp,
	} = args;

	const signaturesSnapshotCount = bundle.signers.filter((s) => s.signed).length;

	const [row] = await database
		.insert(complianceExportLogs)
		.values({
			filePieceCid: pieceCid,
			requestedBy: getAddress(requestedBy),
			bundleVersion: bundle.version,
			bundleHash,
			bundleJson: bundle,
			executionStatus: bundle.executionStatus,
			signaturesSnapshotCount,
			documentSha256: documentSha256 ?? null,
			requestUserAgent: requestUserAgent ?? null,
			requestIp: requestIp ?? null,
		})
		.returning({ id: complianceExportLogs.id });

	const exportId = row?.id;
	if (!exportId) {
		throw new Error("Failed to persist compliance export log");
	}
	return { exportId };
}
