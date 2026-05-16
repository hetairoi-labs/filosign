import assert from "node:assert/strict";
import { expect } from "chai";
import hre from "hardhat";
import type { Hex } from "viem";
import { keccak256, toBytes } from "viem";
import {
	deployFullSystem,
	deployFullSystemWithoutSenderKeygen,
	registerFileAndAttach,
	registerFileAndAttachMulti,
	registerFileSignatureStep,
} from "./fixtures.js";
import { latestBlockTimestamp } from "./helpers/chainTime.js";
import { assertEscrowBalanced } from "./helpers/invariants.js";
import {
	signRegisterFile,
	signRegisterFileSignature,
} from "./helpers/signatures.js";
import { walletAccount } from "./helpers/walletAccount.js";

const defaultPlacement = `0x${"ab".repeat(32)}` as Hex;
const defaultSenderEmail = `0x${"cd".repeat(32)}` as Hex;
const defaultSenderPrivy = `0x${"ef".repeat(32)}` as Hex;

describe("FSFileRegistry", () => {
	it("computeEmailSignerCommitment: empty list yields zero bytes20", async () => {
		const ctx = await deployFullSystem();
		const z = await ctx.fileRegistry.read.computeEmailSignerCommitment([
			[] as Hex[],
		]);
		expect(z).to.equal("0x0000000000000000000000000000000000000000");
	});

	it("computeEmailSignerCommitment: reverts on unsorted commitments", async () => {
		const ctx = await deployFullSystem();
		const hi = `0x${"02".repeat(32)}` as Hex;
		const lo = `0x${"01".repeat(32)}` as Hex;
		await assert.rejects(
			ctx.fileRegistry.read.computeEmailSignerCommitment([[hi, lo]]),
		);
	});

	it("computeEmailSignerCommitment: reverts on zero commitment", async () => {
		const ctx = await deployFullSystem();
		const z = `0x${"00".repeat(32)}` as Hex;
		const lo = `0x${"01".repeat(32)}` as Hex;
		await assert.rejects(
			ctx.fileRegistry.read.computeEmailSignerCommitment([[z, lo]]),
		);
	});

	it("registerFile reverts when sender not in key registry", async () => {
		const ctx = await deployFullSystemWithoutSenderKeygen();
		const c = `0x${"aa".repeat(32)}` as Hex;
		const pieceCid = "no-keygen";
		const sc = await ctx.fileRegistry.read.computeEmailSignerCommitment([[c]]);
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const nonce = await ctx.fileRegistry.read.nonce([
			walletAccount(ctx.sender).address,
		]);
		const sig = await signRegisterFile({
			wallet: ctx.sender,
			fileRegistryAddress: ctx.fileRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			signersCommitment: sc,
			placementCommitment: defaultPlacement,
			senderEmailCommitment: defaultSenderEmail,
			senderPrivySubjectCommitment: defaultSenderPrivy,
			timestamp: ts,
			nonce,
		});
		await assert.rejects(
			ctx.fileRegistry.write.registerFile(
				[
					pieceCid,
					walletAccount(ctx.sender).address,
					[c],
					[],
					defaultSenderEmail,
					defaultSenderPrivy,
					ts,
					sig,
					defaultPlacement,
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("registerFile reverts when file already registered", async () => {
		const ctx = await deployFullSystem();
		const c = `0x${"b1".repeat(32)}` as Hex;
		const pieceCid = "dup-file";
		await registerFileAndAttach(ctx, pieceCid, c);

		const sc = await ctx.fileRegistry.read.computeEmailSignerCommitment([[c]]);
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const nonce = await ctx.fileRegistry.read.nonce([
			walletAccount(ctx.sender).address,
		]);
		const sig = await signRegisterFile({
			wallet: ctx.sender,
			fileRegistryAddress: ctx.fileRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			signersCommitment: sc,
			placementCommitment: defaultPlacement,
			senderEmailCommitment: defaultSenderEmail,
			senderPrivySubjectCommitment: defaultSenderPrivy,
			timestamp: ts,
			nonce,
		});
		await assert.rejects(
			ctx.fileRegistry.write.registerFile(
				[
					pieceCid,
					walletAccount(ctx.sender).address,
					[c],
					[],
					defaultSenderEmail,
					defaultSenderPrivy,
					ts,
					sig,
					defaultPlacement,
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("registerFile reverts on invalid signature", async () => {
		const ctx = await deployFullSystem();
		const c = `0x${"c1".repeat(32)}` as Hex;
		const pieceCid = "bad-sig";
		const ts = await latestBlockTimestamp(ctx.publicClient);
		const fakeSig = `0x${"ab".repeat(65)}` as `0x${string}`;
		await assert.rejects(
			ctx.fileRegistry.write.registerFile(
				[
					pieceCid,
					walletAccount(ctx.sender).address,
					[c],
					[],
					defaultSenderEmail,
					defaultSenderPrivy,
					ts,
					fakeSig,
					defaultPlacement,
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("registerFileSignature reverts for invalid signer commitment", async () => {
		const ctx = await deployFullSystem();
		const onFile = `0x${"d1".repeat(32)}` as Hex;
		const notOnFile = `0x${"d2".repeat(32)}` as Hex;
		const pieceCid = "invalid-signer";
		await registerFileAndAttach(ctx, pieceCid, onFile);

		const ts = await latestBlockTimestamp(ctx.publicClient);
		const n = await ctx.fileRegistry.read.nonce([
			walletAccount(ctx.payout).address,
		]);
		const signSig = await signRegisterFileSignature({
			wallet: ctx.payout,
			fileRegistryAddress: ctx.fileRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			sender: walletAccount(ctx.sender).address,
			signerEmailCommitment: notOnFile,
			privySubjectCommitment: defaultSenderPrivy,
			dl3SignatureCommitment: `0x${"88".repeat(20)}` as Hex,
			completionsRoot: defaultPlacement,
			leafSchemaVersion: 1,
			timestamp: ts,
			nonce: n,
		});
		await assert.rejects(
			ctx.fileRegistry.write.registerFileSignature(
				[
					pieceCid,
					walletAccount(ctx.sender).address,
					walletAccount(ctx.payout).address,
					notOnFile,
					defaultSenderPrivy,
					`0x${"88".repeat(20)}`,
					ts,
					signSig,
					[notOnFile],
					[walletAccount(ctx.payout).address],
					defaultPlacement,
					1,
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("registerFileSignature reverts when already signed", async () => {
		const ctx = await deployFullSystem();
		const c = `0x${"e1".repeat(32)}` as Hex;
		const pieceCid = "double-sign";
		await registerFileAndAttach(ctx, pieceCid, c);
		const step = {
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.payout,
			signerEmailCommitment: c,
			allSignerEmailCommitments: [c],
			payoutWallets: [walletAccount(ctx.payout).address],
		};
		await registerFileSignatureStep(step);
		await assert.rejects(registerFileSignatureStep(step));
	});

	it("two signers: full completion pays both payouts (registry-triggered release)", async () => {
		const ctx = await deployFullSystem();
		const clients = await hre.viem.getWalletClients();
		const payoutA = clients[3];
		const payoutB = clients[4];
		const ca = `0x${"01".repeat(32)}` as Hex;
		const cb = `0x${"02".repeat(32)}` as Hex;
		const pieceCid = "two-signers";

		await registerFileAndAttachMulti(ctx, pieceCid, [ca, cb]);
		await ctx.manager.write.setPlatformFeeBps([0], {
			account: walletAccount(ctx.server),
		});

		await registerFileSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: payoutA,
			signerEmailCommitment: ca,
			allSignerEmailCommitments: [ca, cb],
			payoutWallets: [
				walletAccount(payoutA).address,
				walletAccount(payoutB).address,
			],
		});

		const bBefore = await ctx.mockUsdc.read.balanceOf([
			walletAccount(payoutB).address,
		]);
		await registerFileSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: payoutB,
			signerEmailCommitment: cb,
			allSignerEmailCommitments: [ca, cb],
			payoutWallets: [
				walletAccount(payoutA).address,
				walletAccount(payoutB).address,
			],
		});

		expect(
			await ctx.mockUsdc.read.balanceOf([walletAccount(payoutA).address]),
		).to.equal(ctx.fundAmount);
		expect(
			await ctx.mockUsdc.read.balanceOf([walletAccount(payoutB).address]),
		).to.equal(bBefore + ctx.fundAmount);

		const accounted = await ctx.escrow.read.accountedAssets([
			ctx.mockUsdc.address,
		]);
		const stray = await ctx.escrow.read.strayBalance([ctx.mockUsdc.address]);
		await assertEscrowBalanced(
			ctx.publicClient,
			ctx.escrow.address,
			ctx.mockUsdc.address,
			accounted,
			stray,
		);
	});

	it("last signature reverts when completion batch mis-ordered commitments", async () => {
		const ctx = await deployFullSystem();
		const clients = await hre.viem.getWalletClients();
		const payoutA = clients[3];
		const payoutB = clients[4];
		const ca = `0x${"01".repeat(32)}` as Hex;
		const cb = `0x${"02".repeat(32)}` as Hex;
		const pieceCid = "bad-batch";

		await registerFileAndAttachMulti(ctx, pieceCid, [ca, cb]);

		await registerFileSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: payoutA,
			signerEmailCommitment: ca,
			allSignerEmailCommitments: [ca, cb],
			payoutWallets: [
				walletAccount(payoutA).address,
				walletAccount(payoutB).address,
			],
		});

		const ts = await latestBlockTimestamp(ctx.publicClient);
		const signNonce = await ctx.fileRegistry.read.nonce([
			walletAccount(payoutB).address,
		]);
		const signSig = await signRegisterFileSignature({
			wallet: payoutB,
			fileRegistryAddress: ctx.fileRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			sender: walletAccount(ctx.sender).address,
			signerEmailCommitment: cb,
			privySubjectCommitment: defaultSenderPrivy,
			dl3SignatureCommitment: `0x${"88".repeat(20)}` as Hex,
			completionsRoot: defaultPlacement,
			leafSchemaVersion: 1,
			timestamp: ts,
			nonce: signNonce,
		});
		await assert.rejects(
			ctx.fileRegistry.write.registerFileSignature(
				[
					pieceCid,
					walletAccount(ctx.sender).address,
					walletAccount(payoutB).address,
					cb,
					defaultSenderPrivy,
					`0x${"88".repeat(20)}`,
					ts,
					signSig,
					[cb, ca],
					[walletAccount(payoutA).address, walletAccount(payoutB).address],
					defaultPlacement,
					1,
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("cidIdentifier is keccak256 of piece CID string", async () => {
		const ctx = await deployFullSystem();
		const piece = "bafy-piece";
		const cidId = await ctx.fileRegistry.read.cidIdentifier([piece]);
		expect(cidId).to.equal(keccak256(toBytes(piece)));
	});
});
