import { zHexString } from "@filosign/shared/zod";
import { z } from "zod";
import { rpcEmptyOutputSchema, zDateWire } from "./rpc-wire";

const shareRequestListRowSchema = z.object({
	id: z.string().uuid(),
	senderWallet: z.string(),
	recipientWallet: z.string(),
	message: z.string().nullable(),
	status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"]),
	createdAt: zDateWire,
	updatedAt: zDateWire,
});

export const rpcSharingReceivedRequestsOutputSchema = z.object({
	requests: z.array(shareRequestListRowSchema),
});

export const rpcSharingSentRequestsOutputSchema = z.object({
	requests: z.array(shareRequestListRowSchema),
});

export const rpcSharingEmailInvitesOutputSchema = z.object({
	invites: z.array(
		z.object({
			id: z.string().uuid(),
			inviteeEmail: z.string(),
			message: z.string().nullable(),
			accepted: z.boolean(),
			createdAt: zDateWire,
		}),
	),
});

export const rpcSharingCanSendToOutputSchema = z.object({
	canSend: z.boolean(),
	reason: z.union([
		z.null(),
		z.literal("Cannot send to yourself"),
		z.literal("No active approval"),
	]),
});

export const rpcSharingReceivableFromOutputSchema = z.object({
	approvals: z.array(
		z.object({
			senderWallet: z.string(),
			active: z.boolean(),
			createdAt: z.number(),
		}),
	),
});

export const rpcSharingSendableToOutputSchema = z.object({
	approvals: z.array(
		z.object({
			recipientWallet: z.string(),
			active: z.boolean(),
			createdAt: z.number(),
		}),
	),
});

export const rpcSharingCancelRequestOutputSchema = rpcEmptyOutputSchema;
export const rpcSharingRejectRequestOutputSchema = rpcEmptyOutputSchema;

/** Handler always throws; nominal output for OpenAPI / client typing. */
export const rpcSharingAcceptRequestOutputSchema = rpcEmptyOutputSchema;

export const rpcSharingApproveOutputSchema = z.object({
	txHash: zHexString(),
	reciprocalCreated: z.boolean(),
});

export const rpcSharingInviteByIdOutputSchema = z.object({
	id: z.string().uuid(),
	inviteeEmail: z.string(),
	message: z.string().nullable(),
	createdAt: zDateWire,
	senderName: z.string(),
});

const userInviteRowSchema = z.object({
	id: z.string().uuid(),
	sender: z.string(),
	inviteeEmail: z.string(),
	accepted: z.boolean(),
	message: z.string().nullable(),
	createdAt: zDateWire,
	updatedAt: zDateWire,
	deletedAt: zDateWire.optional().nullable(),
});

export const rpcSharingInviteClaimOutputSchema = userInviteRowSchema;

const shareRequestInsertedRowSchema = z.object({
	id: z.string().uuid(),
	senderWallet: z.string(),
	recipientWallet: z.string(),
	message: z.string().nullable(),
	status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"]),
	createdAt: zDateWire,
});

export const rpcSharingCreateRequestOutputSchema =
	shareRequestInsertedRowSchema.extend({
		emailSent: z.boolean(),
		emailError: z.string().optional(),
	});

export const rpcSharingRequestInviteOutputSchema = z.union([
	z.object({
		exists: z.literal(true),
		alreadyRequested: z.literal(true),
	}),
	z.object({
		exists: z.literal(true),
		alreadyApproved: z.literal(true),
	}),
	z.object({ exists: z.literal(true), requested: z.literal(true) }),
	z.object({
		invited: z.literal(true),
		alreadyInvited: z.literal(true),
	}),
	z.object({ invited: z.literal(true) }),
]);
