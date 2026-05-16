import type { RouterClient } from "@orpc/server";
import { z } from "zod";
import { authNonce, authVerify, zAuthVerifyBody } from "@/api/handlers/auth";
import {
	filesColdInviteByToken,
	filesColdInviteClaim,
	filesColdInviteRegenerate,
} from "@/api/handlers/files-cold-invite";
import {
	filesListReceived,
	filesListSent,
	filesUploadStart,
	zUploadStartBody,
} from "@/api/handlers/files-list-upload";
import * as pieceHandlers from "@/api/handlers/files-piece";
import { filesRegister } from "@/api/handlers/files-register";
import * as sharingHandlers from "@/api/handlers/sharing-handlers";
import { txProcessIndexerHash } from "@/api/handlers/tx";
import * as userHandlers from "@/api/handlers/users-handlers";
import { loadPlatformRuntime } from "@/lib/domain/platform-runtime";
import { zIndexerTxBody } from "@/lib/validation/tx-registration";
import { authenticatedProcedure, publicProcedure } from "./procedures";

const platformRuntimeSchema = z.object({
	uptime: z.number(),
	serverAddressSynapse: z.string(),
	chain: z.unknown(),
	chainKey: z.enum(["local", "testnet", "mainnet"]),
	platformFeeBps: z.number(),
	maxPlatformFeeBps: z.number(),
	treasury: z.string(),
});

const unk = z.unknown();

/** Root router; JSON API lives at `/api/rpc` (+ OpenAPI docs at `/api/api-reference`). */
export const appRouter = {
	healthCheck: publicProcedure
		.output(z.literal("OK"))
		.handler(() => "OK" as const),
	runtime: publicProcedure.output(platformRuntimeSchema).handler(async () => {
		const r = await loadPlatformRuntime();
		return {
			uptime: r.uptime,
			serverAddressSynapse: r.serverAddressSynapse,
			chain: r.chain,
			chainKey: r.chainKey,
			platformFeeBps: r.platformFeeBps,
			maxPlatformFeeBps: r.maxPlatformFeeBps,
			treasury: r.treasury,
		};
	}),
	auth: {
		nonce: publicProcedure
			.input(z.object({ address: z.string() }))
			.output(unk)
			.handler(({ input }) => authNonce(input.address)),
		verify: publicProcedure
			.input(zAuthVerifyBody)
			.output(unk)
			.handler(({ input }) => authVerify(input)),
	},
	tx: {
		processIndexerHash: authenticatedProcedure
			.input(
				z.object({
					hash: z.string(),
					body: zIndexerTxBody.optional(),
				}),
			)
			.output(unk)
			.handler(({ input }) =>
				txProcessIndexerHash({ hash: input.hash }, input.body ?? {}),
			),
	},
	files: {
		uploadStart: authenticatedProcedure
			.input(zUploadStartBody)
			.output(unk)
			.handler(({ context, input }) =>
				filesUploadStart(context.userWallet, input),
			),
		register: authenticatedProcedure
			.input(z.record(z.string(), unk))
			.output(unk)
			.handler(({ context, input }) =>
				filesRegister(context.userWallet, input),
			),
		list: {
			sent: authenticatedProcedure
				.output(unk)
				.handler(({ context }) => filesListSent(context.userWallet)),
			received: authenticatedProcedure
				.output(unk)
				.handler(({ context }) => filesListReceived(context.userWallet)),
		},
		coldInvite: {
			inviteByToken: publicProcedure
				.input(z.object({ inviteToken: z.string().min(1) }))
				.output(unk)
				.handler(({ input }) => filesColdInviteByToken(input.inviteToken)),
			claim: authenticatedProcedure
				.input(
					z.object({
						inviteToken: z.string().min(8),
						body: z.record(z.string(), unk),
					}),
				)
				.output(unk)
				.handler(({ context, input }) =>
					filesColdInviteClaim({
						userWallet: context.userWallet,
						inviteToken: input.inviteToken,
						body: input.body,
					}),
				),
			regenerate: authenticatedProcedure
				.input(
					z.object({
						pieceCid: z.string().min(1),
						body: z.record(z.string(), unk),
					}),
				)
				.output(unk)
				.handler(({ context, input }) =>
					filesColdInviteRegenerate({
						userWallet: context.userWallet,
						pieceCid: input.pieceCid,
						body: input.body,
					}),
				),
		},
		piece: {
			detail: authenticatedProcedure
				.input(z.object({ pieceCid: z.string().min(1) }))
				.output(unk)
				.handler(({ context, input }) =>
					pieceHandlers.pieceDetail(context.userWallet, input.pieceCid),
				),
			ack: authenticatedProcedure
				.input(
					z.object({
						pieceCid: z.string().min(1),
						body: z.record(z.string(), unk),
					}),
				)
				.output(unk)
				.handler(({ context, input }) =>
					pieceHandlers.pieceAck({
						userWallet: context.userWallet,
						pieceCid: input.pieceCid,
						body: input.body,
					}),
				),
			signDraftGet: authenticatedProcedure
				.input(z.object({ pieceCid: z.string().min(1) }))
				.output(unk)
				.handler(({ context, input }) =>
					pieceHandlers.pieceSignDraftGet(context.userWallet, input.pieceCid),
				),
			signDraftPut: authenticatedProcedure
				.input(
					z.object({
						pieceCid: z.string().min(1),
						body: z.record(z.string(), unk),
					}),
				)
				.output(unk)
				.handler(({ context, input }) =>
					pieceHandlers.pieceSignDraftPut({
						userWallet: context.userWallet,
						pieceCid: input.pieceCid,
						body: input.body,
					}),
				),
			s3Url: authenticatedProcedure
				.input(z.object({ pieceCid: z.string().min(1) }))
				.output(unk)
				.handler(({ context, input }) =>
					pieceHandlers.pieceS3Url(context.userWallet, input.pieceCid),
				),
			complianceBundle: authenticatedProcedure
				.input(
					z.object({
						pieceCid: z.string().min(1),
						documentSha256: z.string().optional(),
					}),
				)
				.output(unk)
				.handler(({ context, input }) => {
					const h = context.hono.req;
					const ua = h.header("user-agent") ?? null;
					const fwd = h.header("x-forwarded-for");
					const requestIp = fwd?.split(",")[0]?.trim() ?? null;
					return pieceHandlers.pieceComplianceBundle({
						userWallet: context.userWallet,
						pieceCid: input.pieceCid,
						documentSha256: input.documentSha256,
						userAgent: ua,
						requestIp,
					});
				}),
			incentive: authenticatedProcedure
				.input(
					z.object({
						pieceCid: z.string().min(1),
						body: z.record(z.string(), unk),
					}),
				)
				.output(unk)
				.handler(({ context, input }) =>
					pieceHandlers.pieceIncentive({
						userWallet: context.userWallet,
						pieceCid: input.pieceCid,
						body: input.body,
					}),
				),
			sign: authenticatedProcedure
				.input(
					z.object({
						pieceCid: z.string().min(1),
						body: z.record(z.string(), unk),
					}),
				)
				.output(unk)
				.handler(({ context, input }) =>
					pieceHandlers.pieceSign({
						userWallet: context.userWallet,
						pieceCid: input.pieceCid,
						body: input.body,
					}),
				),
		},
	},
	sharing: {
		receivedRequests: authenticatedProcedure
			.output(unk)
			.handler(({ context }) =>
				sharingHandlers.sharingReceivedRequests(context.userWallet),
			),
		sentRequests: authenticatedProcedure
			.output(unk)
			.handler(({ context }) =>
				sharingHandlers.sharingSentRequests(context.userWallet),
			),
		emailInvites: authenticatedProcedure
			.output(unk)
			.handler(({ context }) =>
				sharingHandlers.sharingEmailInvites(context.userWallet),
			),
		canSendTo: authenticatedProcedure
			.input(z.object({ recipient: z.string() }))
			.output(unk)
			.handler(({ context, input }) =>
				sharingHandlers.sharingCanSendTo(context.userWallet, input.recipient),
			),
		cancelRequest: authenticatedProcedure
			.input(z.object({ id: z.string().min(1) }))
			.output(unk)
			.handler(({ context, input }) =>
				sharingHandlers.sharingCancelRequest(context.userWallet, input.id),
			),
		rejectRequest: authenticatedProcedure
			.input(z.object({ id: z.string().min(1) }))
			.output(unk)
			.handler(({ context, input }) =>
				sharingHandlers.sharingRejectRequest(context.userWallet, input.id),
			),
		acceptRequest: authenticatedProcedure
			.output(unk)
			.handler(() => sharingHandlers.sharingAcceptRequestDenied()),
		approve: authenticatedProcedure
			.input(z.record(z.string(), unk))
			.output(unk)
			.handler(({ context, input }) =>
				sharingHandlers.sharingApprove(context.userWallet, input),
			),
		receivableFrom: authenticatedProcedure
			.output(unk)
			.handler(({ context }) =>
				sharingHandlers.sharingReceivableFrom(context.userWallet),
			),
		sendableTo: authenticatedProcedure
			.output(unk)
			.handler(({ context }) =>
				sharingHandlers.sharingSendableTo(context.userWallet),
			),
		inviteById: publicProcedure
			.input(z.object({ id: z.string().min(1) }))
			.output(unk)
			.handler(({ input }) => sharingHandlers.sharingInviteById(input.id)),
		inviteClaim: authenticatedProcedure
			.input(z.object({ id: z.string().min(1) }))
			.output(unk)
			.handler(({ context, input }) =>
				sharingHandlers.sharingInviteClaim(context.userWallet, input.id),
			),
		createRequest: authenticatedProcedure
			.input(z.record(z.string(), unk))
			.output(unk)
			.handler(({ context, input }) =>
				sharingHandlers.sharingCreateRequest(context.userWallet, input),
			),
		requestInvite: authenticatedProcedure
			.input(z.record(z.string(), unk))
			.output(unk)
			.handler(({ context, input }) =>
				sharingHandlers.sharingRequestInvite(context.userWallet, input),
			),
	},
	users: {
		register: publicProcedure
			.input(z.record(z.string(), unk))
			.output(unk)
			.handler(({ input }) => userHandlers.userRegister(input)),
		profile: {
			me: authenticatedProcedure
				.output(unk)
				.handler(({ context }) =>
					userHandlers.userProfileMe(context.userWallet),
				),
			update: authenticatedProcedure
				.input(z.record(z.string(), unk))
				.output(unk)
				.handler(({ context, input }) =>
					userHandlers.userProfileUpdate(context.userWallet, input),
				),
			prevalidate: authenticatedProcedure
				.input(
					z.object({
						email: z.string().optional(),
						username: z.string().optional(),
					}),
				)
				.output(unk)
				.handler(({ input }) => userHandlers.userProfilePrevalidate(input)),
			lookup: authenticatedProcedure
				.input(z.object({ query: z.string().min(1) }))
				.output(unk)
				.handler(({ context, input }) =>
					userHandlers.userProfileLookup(context.userWallet, input.query),
				),
			syncPrivyEmail: authenticatedProcedure
				.input(z.record(z.string(), unk))
				.output(unk)
				.handler(({ context, input }) =>
					userHandlers.userProfileSyncPrivyEmail(context.userWallet, input),
				),
			setPrimaryEmail: authenticatedProcedure
				.input(z.record(z.string(), unk))
				.output(unk)
				.handler(({ context, input }) =>
					userHandlers.userProfileSetPrimaryEmail(context.userWallet, input),
				),
		},
		signatures: {
			create: authenticatedProcedure
				.input(z.record(z.string(), unk))
				.output(unk)
				.handler(({ context, input }) =>
					userHandlers.userSignaturesCreate(context.userWallet, input),
				),
			list: authenticatedProcedure
				.output(unk)
				.handler(({ context }) =>
					userHandlers.userSignaturesList(context.userWallet),
				),
			get: authenticatedProcedure
				.input(z.object({ id: z.string().min(1) }))
				.output(unk)
				.handler(({ context, input }) =>
					userHandlers.userSignaturesGetById(context.userWallet, input.id),
				),
		},
	},
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
