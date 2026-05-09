import * as t from "drizzle-orm/pg-core";
import { tBytes32, tEvmAddress, tHex, timestamps } from "../helpers";
import { userSignatures, users } from "./user";

export const files = t.pgTable(
	"files",
	{
		pieceCid: t.text().notNull().primaryKey(),
		sender: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),

		status: t.text({ enum: ["s3", "foc", "unpaid_for", "invalid"] }).notNull(),
		onchainTxHash: tBytes32().unique().notNull(),

		...timestamps,
	},
	(table) => [t.index("idx_files_owner").on(table.sender)],
);

export const fileParticipants = t.pgTable(
	"file_participants",
	{
		filePieceCid: t
			.text()
			.notNull()
			.references(() => files.pieceCid, { onDelete: "cascade" }),
		wallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),

		role: t.text({ enum: ["sender", "viewer", "signer"] }).notNull(),

		kemCiphertext: tHex().notNull(),
		encryptedEncryptionKey: tHex().notNull(),

		...timestamps,
	},
	(table) => [
		t.primaryKey({
			columns: [table.filePieceCid, table.wallet],
			name: "pk_file_participants",
		}),
		t.index("idx_participants_wallet").on(table.wallet),
		t.index("idx_participants_file").on(table.filePieceCid),
	],
);

export const fileAcknowledgements = t.pgTable(
	"file_acknowledgements",
	{
		filePieceCid: t
			.text()
			.notNull()
			.references(() => files.pieceCid, { onDelete: "cascade" }),
		wallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		ack: tHex().notNull(),

		...timestamps,
	},
	(table) => [
		t.primaryKey({
			columns: [table.filePieceCid, table.wallet],
			name: "pk_file_acknowledgements",
		}),
		t.index("idx_acknowledgements_file").on(table.filePieceCid),
		t.index("idx_acknowledgements_wallet").on(table.wallet),
	],
);

export const fileSignatures = t.pgTable(
	"file_signatures",
	{
		filePieceCid: t
			.text()
			.notNull()
			.references(() => files.pieceCid, { onDelete: "cascade" }),
		signatureId: t
			.uuid()
			.references(() => userSignatures.id, { onDelete: "cascade" }),
		signer: t.text().notNull(),
		evmSignature: tHex().notNull(),
		dl3Signature: tHex().notNull(),
		onchainTxHash: t.text(),

		...timestamps,
	},
	(table) => [
		t.primaryKey({
			columns: [table.filePieceCid, table.signer],
			name: "pk_file_signatures",
		}),
		t.index("idx_signatures_file").on(table.filePieceCid),
	],
);
