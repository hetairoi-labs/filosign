import assert from "node:assert/strict";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, type Hex, zeroAddress } from "viem";
import {
	BPS,
	deployFullSystem,
	registerFileAndAttach,
	registerFileOnly,
	registerFileSignatureStep,
} from "./fixtures.js";
import { latestBlockTimestamp } from "./helpers/chainTime.js";
import {
	signApproveSender,
	signMockUsdcPermit,
	signRegisterFile,
} from "./helpers/signatures.js";
import { walletAccount, walletClientAt } from "./helpers/walletAccount.js";

const PAUSE_ATTACH = 1;
const PAUSE_RELEASE = 2;
const PAUSE_REFUND = 4;
const PAUSE_ADMIN = 16;

describe("FSManager", () => {
	it("releaseIncentives applies platform fee via escrow (single signer)", async () => {
		const ctx = await deployFullSystem();
		const commitment = `0x${"aa".repeat(32)}` as Hex;
		const pieceCid = "manager-fee-cid";

		await registerFileAndAttach(ctx, pieceCid, commitment);
		await ctx.manager.write.setPlatformFeeBps([250], {
			account: walletAccount(ctx.server),
		});

		const fee = (ctx.fundAmount * 250n) / BPS;
		const net = ctx.fundAmount - fee;

		await registerFileSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.payout,
			signerEmailCommitment: commitment,
			allSignerEmailCommitments: [commitment],
			payoutWallets: [walletAccount(ctx.payout).address],
		});

		expect(
			await ctx.mockUsdc.read.balanceOf([walletAccount(ctx.payout).address]),
		).to.equal(net);
		expect(
			await ctx.escrow.read.platformRevenue([ctx.mockUsdc.address]),
		).to.equal(fee);
	});

	it("withdrawPlatformRevenue credits treasury", async () => {
		const ctx = await deployFullSystem();
		const commitment = `0x${"bb".repeat(32)}` as Hex;
		const pieceCid = "withdraw-cid";
		await registerFileAndAttach(ctx, pieceCid, commitment);
		await ctx.manager.write.setPlatformFeeBps([500], {
			account: walletAccount(ctx.server),
		});

		await registerFileSignatureStep({
			ctx,
			pieceCid,
			senderAddr: walletAccount(ctx.sender).address,
			signerWallet: ctx.payout,
			signerEmailCommitment: commitment,
			allSignerEmailCommitments: [commitment],
			payoutWallets: [walletAccount(ctx.payout).address],
		});

		const fee = (ctx.fundAmount * 500n) / BPS;
		const before = await ctx.mockUsdc.read.balanceOf([
			walletAccount(ctx.treasury).address,
		]);
		await ctx.manager.write.withdrawPlatformRevenue(
			[ctx.mockUsdc.address, fee],
			{ account: walletAccount(ctx.server) },
		);
		expect(
			await ctx.mockUsdc.read.balanceOf([walletAccount(ctx.treasury).address]),
		).to.equal(before + fee);
	});

	it("reverts InvalidPayoutWallet when last signature supplies zero payout", async () => {
		const ctx = await deployFullSystem();
		const commitment = `0x${"cc".repeat(32)}` as Hex;
		const pieceCid = "zero-payout-cid";
		await registerFileAndAttach(ctx, pieceCid, commitment);

		await assert.rejects(
			registerFileSignatureStep({
				ctx,
				pieceCid,
				senderAddr: walletAccount(ctx.sender).address,
				signerWallet: ctx.payout,
				signerEmailCommitment: commitment,
				allSignerEmailCommitments: [commitment],
				payoutWallets: [getAddress(zeroAddress)],
			}),
		);
	});

	it("reverts attach when token is not allowlisted", async () => {
		const ctx = await deployFullSystem();
		const other = await hre.viem.deployContract("MockUSDCToken", [
			walletAccount(ctx.server).address,
		]);
		await other.write.mint([walletAccount(ctx.sender).address, ctx.fundAmount]);

		const commitment = `0x${"dd".repeat(32)}` as Hex;
		const pieceCid = "bad-token-cid";
		await registerFileAndAttach(ctx, pieceCid, commitment);

		await assert.rejects(
			ctx.manager.write.attachIncentive(
				[
					pieceCid,
					`0x${"ee".repeat(32)}`,
					other.address,
					ctx.fundAmount,
					`0x${"ff".repeat(32)}`,
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("reverts setPlatformFeeBps above cap", async () => {
		const ctx = await deployFullSystem();
		await assert.rejects(
			ctx.manager.write.setPlatformFeeBps([1001], {
				account: walletAccount(ctx.server),
			}),
		);
	});

	it("pauses attach when PAUSE_ATTACH set", async () => {
		const ctx = await deployFullSystem();
		await ctx.manager.write.setPauseFlags([PAUSE_ATTACH], {
			account: walletAccount(ctx.server),
		});
		const c1 = `0x${"f1".repeat(32)}` as Hex;
		const pieceCid = "paused-attach";
		await registerFileOnly(ctx, pieceCid, [c1]);
		await ctx.mockUsdc.write.approve([ctx.escrow.address, ctx.fundAmount], {
			account: walletAccount(ctx.sender),
		});
		await assert.rejects(
			ctx.manager.write.attachIncentive(
				[
					pieceCid,
					c1,
					ctx.mockUsdc.address,
					ctx.fundAmount,
					`0x${"f3".repeat(32)}`,
				],
				{ account: walletAccount(ctx.server) },
			),
		);
		await ctx.manager.write.setPauseFlags([0], {
			account: walletAccount(ctx.server),
		});
		await ctx.manager.write.attachIncentive(
			[
				pieceCid,
				c1,
				ctx.mockUsdc.address,
				ctx.fundAmount,
				`0x${"f3".repeat(32)}`,
			],
			{ account: walletAccount(ctx.server) },
		);
	});

	it("pauses admin setPlatformFeeBps when PAUSE_ADMIN set", async () => {
		const ctx = await deployFullSystem();
		await ctx.manager.write.setPauseFlags([PAUSE_ADMIN], {
			account: walletAccount(ctx.server),
		});
		await assert.rejects(
			ctx.manager.write.setPlatformFeeBps([100], {
				account: walletAccount(ctx.server),
			}),
		);
	});

	it("approveSender approves when recipient EIP-712 signature valid", async () => {
		const ctx = await deployFullSystem();
		const recipient = walletClientAt(await hre.viem.getWalletClients(), 5);

		const nonce = 0n;
		const deadline = (await latestBlockTimestamp(ctx.publicClient)) + 86400n;
		const sig = await signApproveSender({
			wallet: recipient,
			managerAddress: ctx.manager.address,
			chainId: ctx.chainId,
			recipient: walletAccount(recipient).address,
			sender: walletAccount(ctx.sender).address,
			nonce,
			deadline,
		});
		await ctx.manager.write.approveSender(
			[
				walletAccount(recipient).address,
				walletAccount(ctx.sender).address,
				nonce,
				deadline,
				sig,
			],
			{ account: walletAccount(ctx.server) },
		);
		expect(
			await ctx.manager.read.approvedSenders([
				walletAccount(recipient).address,
				walletAccount(ctx.sender).address,
			]),
		).to.equal(true);
	});

	it("approveSender reverts when sender not registered in key registry", async () => {
		const ctx = await deployFullSystem();
		const clients = await hre.viem.getWalletClients();
		const recipient = walletClientAt(clients, 5);
		const stranger = walletClientAt(clients, 6);
		const nonce = 0n;
		const deadline = (await latestBlockTimestamp(ctx.publicClient)) + 86400n;
		const sig = await signApproveSender({
			wallet: recipient,
			managerAddress: ctx.manager.address,
			chainId: ctx.chainId,
			recipient: walletAccount(recipient).address,
			sender: walletAccount(stranger).address,
			nonce,
			deadline,
		});
		await assert.rejects(
			ctx.manager.write.approveSender(
				[
					walletAccount(recipient).address,
					walletAccount(stranger).address,
					nonce,
					deadline,
					sig,
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("approveSender reverts on wrong nonce", async () => {
		const ctx = await deployFullSystem();
		const recipient = walletClientAt(await hre.viem.getWalletClients(), 5);
		const deadline = (await latestBlockTimestamp(ctx.publicClient)) + 86400n;
		const sig = await signApproveSender({
			wallet: recipient,
			managerAddress: ctx.manager.address,
			chainId: ctx.chainId,
			recipient: walletAccount(recipient).address,
			sender: walletAccount(ctx.sender).address,
			nonce: 1n,
			deadline,
		});
		await assert.rejects(
			ctx.manager.write.approveSender(
				[
					walletAccount(recipient).address,
					walletAccount(ctx.sender).address,
					1n,
					deadline,
					sig,
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("approveSender reverts when deadline passed", async () => {
		const ctx = await deployFullSystem();
		const recipient = walletClientAt(await hre.viem.getWalletClients(), 5);
		const deadline = 1n;
		const sig = await signApproveSender({
			wallet: recipient,
			managerAddress: ctx.manager.address,
			chainId: ctx.chainId,
			recipient: walletAccount(recipient).address,
			sender: walletAccount(ctx.sender).address,
			nonce: 0n,
			deadline,
		});
		await assert.rejects(
			ctx.manager.write.approveSender(
				[
					walletAccount(recipient).address,
					walletAccount(ctx.sender).address,
					0n,
					deadline,
					sig,
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("refundSignerIncentive reverts before delay then succeeds", async () => {
		const ctx = await deployFullSystem();
		const commitment = `0x${"e1".repeat(32)}` as Hex;
		const pieceCid = "refund-cid";
		await registerFileAndAttach(ctx, pieceCid, commitment);

		await assert.rejects(
			ctx.manager.write.refundSignerIncentive([pieceCid, commitment], {
				account: walletAccount(ctx.server),
			}),
		);

		const delay = await ctx.fileRegistry.read.INCENTIVE_REFUND_DELAY();
		await time.increase(delay + 1n);

		const before = await ctx.mockUsdc.read.balanceOf([
			walletAccount(ctx.sender).address,
		]);
		await ctx.manager.write.refundSignerIncentive([pieceCid, commitment], {
			account: walletAccount(ctx.server),
		});
		expect(
			await ctx.mockUsdc.read.balanceOf([walletAccount(ctx.sender).address]),
		).to.equal(before + ctx.fundAmount);
	});

	it("releaseIncentives reverts when not all signed", async () => {
		const ctx = await deployFullSystem();
		const commitment = `0x${"d1".repeat(32)}` as Hex;
		const pieceCid = "not-all-signed";
		await registerFileAndAttach(ctx, pieceCid, commitment);

		await assert.rejects(
			ctx.manager.write.releaseIncentives(
				[pieceCid, [commitment], [walletAccount(ctx.payout).address]],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("pauses registry-triggered release when PAUSE_RELEASE", async () => {
		const ctx = await deployFullSystem();
		const commitment = `0x${"a1".repeat(32)}` as Hex;
		const pieceCid = "pause-release";
		await registerFileAndAttach(ctx, pieceCid, commitment);
		await ctx.manager.write.setPauseFlags([PAUSE_RELEASE], {
			account: walletAccount(ctx.server),
		});
		await assert.rejects(
			registerFileSignatureStep({
				ctx,
				pieceCid,
				senderAddr: walletAccount(ctx.sender).address,
				signerWallet: ctx.payout,
				signerEmailCommitment: commitment,
				allSignerEmailCommitments: [commitment],
				payoutWallets: [walletAccount(ctx.payout).address],
			}),
		);
	});

	it("pauses refund when PAUSE_REFUND", async () => {
		const ctx = await deployFullSystem();
		const commitment = `0x${"a2".repeat(32)}` as Hex;
		const pieceCid = "pause-refund";
		await registerFileAndAttach(ctx, pieceCid, commitment);
		const delay = await ctx.fileRegistry.read.INCENTIVE_REFUND_DELAY();
		await time.increase(delay + 1n);
		await ctx.manager.write.setPauseFlags([PAUSE_REFUND], {
			account: walletAccount(ctx.server),
		});
		await assert.rejects(
			ctx.manager.write.refundSignerIncentive([pieceCid, commitment], {
				account: walletAccount(ctx.server),
			}),
		);
	});

	it("attachIncentiveWithPermit deposits via permit path", async () => {
		const ctx = await deployFullSystem();
		const commitment = `0x${"c1".repeat(32)}` as Hex;
		const pieceCid = "permit-attach-cid";

		const timestamp = await latestBlockTimestamp(ctx.publicClient);
		const regNonce = await ctx.fileRegistry.read.nonce([
			walletAccount(ctx.sender).address,
		]);
		const placement = `0x${"ab".repeat(32)}` as Hex;
		const senderEmail = `0x${"cd".repeat(32)}` as Hex;
		const senderPrivy = `0x${"ef".repeat(32)}` as Hex;
		const signersCommitment =
			await ctx.fileRegistry.read.computeEmailSignerCommitment([[commitment]]);
		const regSig = await signRegisterFile({
			wallet: ctx.sender,
			fileRegistryAddress: ctx.fileRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			signersCommitment,
			placementCommitment: placement,
			senderEmailCommitment: senderEmail,
			senderPrivySubjectCommitment: senderPrivy,
			timestamp,
			nonce: regNonce,
		});
		await ctx.fileRegistry.write.registerFile(
			[
				pieceCid,
				walletAccount(ctx.sender).address,
				[commitment],
				[],
				senderEmail,
				senderPrivy,
				timestamp,
				regSig,
				placement,
			],
			{ account: walletAccount(ctx.server) },
		);

		const deadline = (await latestBlockTimestamp(ctx.publicClient)) + 7200n;
		const pNonce = await ctx.mockUsdc.read.nonces([
			walletAccount(ctx.sender).address,
		]);
		const { v, r, s } = await signMockUsdcPermit({
			wallet: ctx.sender,
			tokenAddress: ctx.mockUsdc.address,
			chainId: ctx.chainId,
			owner: walletAccount(ctx.sender).address,
			spender: ctx.escrow.address,
			value: ctx.fundAmount,
			nonce: pNonce,
			deadline,
		});

		await ctx.manager.write.attachIncentiveWithPermit(
			[
				pieceCid,
				commitment,
				ctx.mockUsdc.address,
				ctx.fundAmount,
				`0x${"11".repeat(32)}`,
				deadline,
				v,
				r,
				s,
			],
			{ account: walletAccount(ctx.server) },
		);

		expect(
			await ctx.escrow.read.balances([
				walletAccount(ctx.sender).address,
				ctx.mockUsdc.address,
			]),
		).to.equal(ctx.fundAmount);
	});
});
