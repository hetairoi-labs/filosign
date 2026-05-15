import { expect } from "chai";
import hre from "hardhat";
import { getAddress, type Hex, parseUnits } from "viem";
import {
	COMMIT_DILITHIUM,
	COMMIT_KYBER,
	SALT_CHALLENGE,
	SALT_PIN,
	SALT_SEED,
	signRegisterFile,
	signRegisterFileSignature,
	signRegisterKeygen,
} from "./helpers/signatures.js";

const BPS = 10_000n;

async function deployEscrowOnly() {
	const [server, treasury, sender, payout] = await hre.viem.getWalletClients();
	const escrow = await hre.viem.deployContract("FSEscrow", [], {
		client: { wallet: server },
	});
	const mockUsdc = await hre.viem.deployContract("MockUSDCToken", [
		server.account.address,
	]);
	await escrow.write.setAllowedToken([mockUsdc.address, true]);
	const fundAmount = parseUnits("100", 6);
	await mockUsdc.write.mint([sender.account.address, parseUnits("1000", 6)]);
	return { escrow, mockUsdc, server, treasury, sender, payout, fundAmount };
}

async function deployFullSystem() {
	const [server, treasury, sender, payout] = await hre.viem.getWalletClients();
	const publicClient = await hre.viem.getPublicClient();
	const chainId = await publicClient.getChainId();

	const manager = await hre.viem.deployContract(
		"FSManager",
		[treasury.account.address],
		{ client: { wallet: server } },
	);
	const fileRegistry = await hre.viem.getContractAt(
		"FSFileRegistry",
		await manager.read.fileRegistry(),
	);
	const keyRegistry = await hre.viem.getContractAt(
		"FSKeyRegistry",
		await manager.read.keyRegistry(),
	);
	const escrow = await hre.viem.getContractAt(
		"FSEscrow",
		await manager.read.escrow(),
	);
	const mockUsdc = await hre.viem.deployContract("MockUSDCToken", [
		server.account.address,
	]);
	await manager.write.setTokenAllowed([mockUsdc.address, true]);

	const keySig = await signRegisterKeygen(sender, keyRegistry.address, chainId);
	await keyRegistry.write.registerKeygenData(
		[
			SALT_PIN,
			SALT_SEED,
			SALT_CHALLENGE,
			COMMIT_KYBER,
			COMMIT_DILITHIUM,
			keySig,
			sender.account.address,
		],
		{ account: server.account },
	);

	const fundAmount = parseUnits("100", 6);
	await mockUsdc.write.mint([sender.account.address, parseUnits("1000", 6)]);

	return {
		manager,
		fileRegistry,
		escrow,
		mockUsdc,
		server,
		treasury,
		sender,
		payout,
		publicClient,
		chainId,
		fundAmount,
	};
}

async function registerFileAndAttach(
	ctx: Awaited<ReturnType<typeof deployFullSystem>>,
	pieceCid: string,
	signerCommitment: Hex,
) {
	const {
		manager,
		fileRegistry,
		mockUsdc,
		server,
		sender,
		fundAmount,
		chainId,
	} = ctx;
	const timestamp = BigInt(Math.floor(Date.now() / 1000));
	const nonce = await fileRegistry.read.nonce([sender.account.address]);
	const placement = `0x${"ab".repeat(32)}` as Hex;
	const senderEmail = `0x${"cd".repeat(32)}` as Hex;
	const senderPrivy = `0x${"ef".repeat(32)}` as Hex;

	const signersCommitment =
		await fileRegistry.read.computeEmailSignerCommitment([[signerCommitment]]);

	const regSig = await signRegisterFile({
		wallet: sender,
		fileRegistryAddress: fileRegistry.address,
		chainId,
		pieceCid,
		signersCommitment,
		placementCommitment: placement,
		senderEmailCommitment: senderEmail,
		senderPrivySubjectCommitment: senderPrivy,
		timestamp,
		nonce,
	});

	await fileRegistry.write.registerFile(
		[
			pieceCid,
			sender.account.address,
			[signerCommitment],
			[],
			senderEmail,
			senderPrivy,
			timestamp,
			regSig,
			placement,
		],
		{ account: server.account },
	);

	await mockUsdc.write.approve([ctx.escrow.address, fundAmount], {
		account: sender.account,
	});
	await manager.write.attachIncentive(
		[
			pieceCid,
			signerCommitment,
			mockUsdc.address,
			fundAmount,
			`0x${"11".repeat(32)}`,
		],
		{ account: server.account },
	);
}

describe("FSEscrow v2", () => {
	it("settleIncentiveRelease accrues platform revenue", async () => {
		const { escrow, mockUsdc, server, sender, payout, fundAmount } =
			await deployEscrowOnly();

		await mockUsdc.write.approve([escrow.address, fundAmount], {
			account: sender.account,
		});
		await escrow.write.deposit(
			[mockUsdc.address, sender.account.address, fundAmount],
			{ account: server.account },
		);

		const feeBps = 100n;
		const fee = (fundAmount * feeBps) / BPS;
		const net = fundAmount - fee;

		await escrow.write.settleIncentiveRelease(
			[
				mockUsdc.address,
				sender.account.address,
				payout.account.address,
				fundAmount,
				Number(feeBps),
			],
			{ account: server.account },
		);

		expect(await mockUsdc.read.balanceOf([payout.account.address])).to.equal(
			net,
		);
		expect(await escrow.read.platformRevenue([mockUsdc.address])).to.equal(fee);
		expect(await escrow.read.totalLiabilities([mockUsdc.address])).to.equal(0n);
	});

	it("sweepStrayToken only moves unaccounted balance", async () => {
		const { escrow, mockUsdc, server, treasury } = await deployEscrowOnly();
		const stray = parseUnits("5", 6);
		await mockUsdc.write.mint([escrow.address, stray]);

		const before = await mockUsdc.read.balanceOf([treasury.account.address]);
		await escrow.write.sweepStrayToken(
			[mockUsdc.address, treasury.account.address, stray],
			{ account: server.account },
		);
		expect(await mockUsdc.read.balanceOf([treasury.account.address])).to.equal(
			before + stray,
		);
	});
});

describe("FSManager platform fee", () => {
	it("releaseIncentives applies fee via escrow", async () => {
		const ctx = await deployFullSystem();
		const commitment = `0x${"aa".repeat(32)}` as Hex;
		const pieceCid = "manager-fee-cid";

		await registerFileAndAttach(ctx, pieceCid, commitment);
		await ctx.manager.write.setPlatformFeeBps([250n], {
			account: ctx.server.account,
		});

		const fee = (ctx.fundAmount * 250n) / BPS;
		const net = ctx.fundAmount - fee;

		const signTs = BigInt(Math.floor(Date.now() / 1000));
		const signNonce = await ctx.fileRegistry.read.nonce([
			ctx.payout.account.address,
		]);
		const signSig = await signRegisterFileSignature({
			wallet: ctx.payout,
			fileRegistryAddress: ctx.fileRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			sender: ctx.sender.account.address,
			signerEmailCommitment: commitment,
			privySubjectCommitment: `0x${"99".repeat(32)}`,
			dl3SignatureCommitment: `0x${"88".repeat(20)}`,
			completionsRoot: `0x${"77".repeat(32)}`,
			leafSchemaVersion: 1,
			timestamp: signTs,
			nonce: signNonce,
		});

		await ctx.fileRegistry.write.registerFileSignature(
			[
				pieceCid,
				ctx.sender.account.address,
				ctx.payout.account.address,
				commitment,
				`0x${"99".repeat(32)}`,
				`0x${"88".repeat(20)}`,
				signTs,
				signSig,
				[commitment],
				[ctx.payout.account.address],
				`0x${"77".repeat(32)}`,
				1,
			],
			{ account: ctx.server.account },
		);

		expect(
			await ctx.mockUsdc.read.balanceOf([ctx.payout.account.address]),
		).to.equal(net);
		expect(
			await ctx.escrow.read.platformRevenue([ctx.mockUsdc.address]),
		).to.equal(fee);
	});

	async function completeSigning(
		ctx: Awaited<ReturnType<typeof deployFullSystem>>,
		pieceCid: string,
		commitment: Hex,
	) {
		const signTs = BigInt(Math.floor(Date.now() / 1000));
		const signNonce = await ctx.fileRegistry.read.nonce([
			ctx.payout.account.address,
		]);
		const signSig = await signRegisterFileSignature({
			wallet: ctx.payout,
			fileRegistryAddress: ctx.fileRegistry.address,
			chainId: ctx.chainId,
			pieceCid,
			sender: ctx.sender.account.address,
			signerEmailCommitment: commitment,
			privySubjectCommitment: `0x${"99".repeat(32)}`,
			dl3SignatureCommitment: `0x${"88".repeat(20)}`,
			completionsRoot: `0x${"77".repeat(32)}`,
			leafSchemaVersion: 1,
			timestamp: signTs,
			nonce: signNonce,
		});
		await ctx.fileRegistry.write.registerFileSignature(
			[
				pieceCid,
				ctx.sender.account.address,
				ctx.payout.account.address,
				commitment,
				`0x${"99".repeat(32)}`,
				`0x${"88".repeat(20)}`,
				signTs,
				signSig,
				[commitment],
				[ctx.payout.account.address],
				`0x${"77".repeat(32)}`,
				1,
			],
			{ account: ctx.server.account },
		);
	}

	it("withdrawPlatformRevenue credits treasury", async () => {
		const ctx = await deployFullSystem();
		const commitment = `0x${"bb".repeat(32)}` as Hex;
		const pieceCid = "withdraw-cid";
		await registerFileAndAttach(ctx, pieceCid, commitment);
		await ctx.manager.write.setPlatformFeeBps([500n], {
			account: ctx.server.account,
		});
		await completeSigning(ctx, pieceCid, commitment);

		const fee = (ctx.fundAmount * 500n) / BPS;
		const before = await ctx.mockUsdc.read.balanceOf([
			ctx.treasury.account.address,
		]);
		await ctx.manager.write.withdrawPlatformRevenue(
			[ctx.mockUsdc.address, fee],
			{ account: ctx.server.account },
		);
		expect(
			await ctx.mockUsdc.read.balanceOf([ctx.treasury.account.address]),
		).to.equal(before + fee);
	});

	it("reverts zero payout when amount > 0", async () => {
		const ctx = await deployFullSystem();
		const commitment = `0x${"cc".repeat(32)}` as Hex;
		const pieceCid = "zero-payout";
		await registerFileAndAttach(ctx, pieceCid, commitment);
		await completeSigning(ctx, pieceCid, commitment);

		await expect(
			ctx.manager.write.releaseIncentives(
				[
					[commitment],
					[getAddress("0x0000000000000000000000000000000000000000")],
				],
				{ account: ctx.server.account },
			),
		).to.be.rejected;
	});

	it("rejects disallowed tokens on attach", async () => {
		const ctx = await deployFullSystem();
		const other = await hre.viem.deployContract("MockUSDCToken", [
			ctx.server.account.address,
		]);
		await other.write.mint([ctx.sender.account.address, ctx.fundAmount]);

		const commitment = `0x${"dd".repeat(32)}` as Hex;
		const pieceCid = "bad-token-cid";
		await registerFileAndAttach(ctx, pieceCid, commitment);

		await expect(
			ctx.manager.write.attachIncentive(
				[
					pieceCid,
					`0x${"ee".repeat(32)}`,
					other.address,
					ctx.fundAmount,
					`0x${"ff".repeat(32)}`,
				],
				{ account: ctx.server.account },
			),
		).to.be.rejected;
	});
});
