import * as t from "drizzle-orm/pg-core";
import { tEvmAddress, timestamps } from "../helpers";

export const users = t.pgTable("users", {
	walletAddress: tEvmAddress().primaryKey(),
	keygenDataJson: t.jsonb(),
	encryptionPublicKey: t.text().notNull(),
	signaturePublicKey: t.text().notNull(),

	/**non core here */
	lastActiveAt: t.timestamp({ withTimezone: true }),
	privyDid: t.text(), // add later
	email: t.text(),
	mobile: t.text(),
	username: t.text().unique(),
	firstName: t.text(),
	lastName: t.text(),
	avatarKey: t.text(),
	invitedBy: tEvmAddress(),

	...timestamps,
});

export const usersDatasets = t.pgTable("users_datasets", {
	walletAddress: tEvmAddress()
		.references(() => users.walletAddress, {
			onDelete: "cascade",
		})
		.primaryKey(),
	dataSetId: t.integer().notNull(),
	providerAddress: t.text().notNull(),
	totalDepositedBaseUnits: t
		.bigint({ mode: "bigint" })
		.notNull()
		.default(BigInt(0)),

	...timestamps,
});

export const userInvites = t.pgTable("user_invites", {
	id: t.uuid().primaryKey().defaultRandom(),
	sender: tEvmAddress()
		.references(() => users.walletAddress, {
			onDelete: "cascade",
		})
		.notNull(),
	inviteeEmail: t.text().notNull(),
	accepted: t.boolean().notNull().default(false),
	message: t.text(),

	...timestamps,
});

export const userHistory = t.pgTable("user_history", {
	id: t.uuid().primaryKey().defaultRandom(),
	walletAddress: tEvmAddress()
		.references(() => users.walletAddress, {
			onDelete: "cascade",
		})
		.notNull(),
	fieldName: t.text().notNull(), // 'email' or 'username'
	oldValue: t.text().notNull(),
	newValue: t.text().notNull(),
	changedAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),

	...timestamps,
});

export const userSignatures = t.pgTable("user_signatures", {
	id: t.uuid().primaryKey().defaultRandom(),
	walletAddress: tEvmAddress().notNull(),
	data: t.text().notNull(),

	...timestamps,
});
