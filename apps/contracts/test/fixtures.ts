import hre from "hardhat";
import type { Hex, PublicClient, WalletClient } from "viem";
import { parseUnits } from "viem";
import { latestBlockTimestamp } from "./helpers/chainTime.js";
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
import { walletAccount } from "./helpers/walletAccount.js";

export const BPS = 10_000n;

export type EscrowOnlyFixture = {
	escrow: Awaited<ReturnType<typeof hre.viem.deployContract<"FSEscrow">>>;
	mockUsdc: Awaited<
		ReturnType<typeof hre.viem.deployContract<"MockUSDCToken">>
	>;
	server: WalletClient;
	treasury: WalletClient;
	sender: WalletClient;
	payout: WalletClient;
	publicClient: PublicClient;
	fundAmount: bigint;
};

export type FullSystemFixture = {
	escrow: Awaited<ReturnType<typeof hre.viem.getContractAt<"FSEscrow">>>;
	manager: Awaited<ReturnType<typeof hre.viem.deployContract<"FSManager">>>;
	fileRegistry: Awaited<
		ReturnType<typeof hre.viem.getContractAt<"FSFileRegistry">>
	>;
	keyRegistry: Awaited<
		ReturnType<typeof hre.viem.getContractAt<"FSKeyRegistry">>
	>;
	mockUsdc: Awaited<
		ReturnType<typeof hre.viem.deployContract<"MockUSDCToken">>
	>;
	server: WalletClient;
	treasury: WalletClient;
	sender: WalletClient;
	payout: WalletClient;
	publicClient: PublicClient;
	chainId: number;
	fundAmount: bigint;
};

export async function deployEscrowOnly(): Promise<EscrowOnlyFixture> {
	const [server, treasury, sender, payout] = await hre.viem.getWalletClients();
	const publicClient = await hre.viem.getPublicClient();
	const escrow = await hre.viem.deployContract("FSEscrow", [], {
		client: { wallet: server },
	});
	const mockUsdc = await hre.viem.deployContract("MockUSDCToken", [
		walletAccount(server).address,
	]);
	await escrow.write.setAllowedToken([mockUsdc.address, true]);
	const fundAmount = parseUnits("100", 6);
	await mockUsdc.write.mint([
		walletAccount(sender).address,
		parseUnits("1000", 6),
	]);
	return {
		escrow,
		mockUsdc,
		server,
		treasury,
		sender,
		payout,
		publicClient,
		fundAmount,
	};
}

export async function deployFullSystem(): Promise<FullSystemFixture> {
	const [server, treasury, sender, payout] = await hre.viem.getWalletClients();
	const publicClient = await hre.viem.getPublicClient();
	const chainId = await publicClient.getChainId();

	const manager = await hre.viem.deployContract(
		"FSManager",
		[walletAccount(treasury).address],
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
		walletAccount(server).address,
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
			walletAccount(sender).address,
		],
		{ account: walletAccount(server) },
	);

	const fundAmount = parseUnits("100", 6);
	await mockUsdc.write.mint([
		walletAccount(sender).address,
		parseUnits("1000", 6),
	]);

	return {
		escrow,
		manager,
		fileRegistry,
		keyRegistry,
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

/** Manager + registry + token; **no** `FSKeyRegistry` row for `sender` (for negative registration tests). */
export async function deployFullSystemWithoutSenderKeygen(): Promise<FullSystemFixture> {
	const [server, treasury, sender, payout] = await hre.viem.getWalletClients();
	const publicClient = await hre.viem.getPublicClient();
	const chainId = await publicClient.getChainId();

	const manager = await hre.viem.deployContract(
		"FSManager",
		[walletAccount(treasury).address],
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
		walletAccount(server).address,
	]);
	await manager.write.setTokenAllowed([mockUsdc.address, true]);

	const fundAmount = parseUnits("100", 6);
	await mockUsdc.write.mint([
		walletAccount(sender).address,
		parseUnits("1000", 6),
	]);

	return {
		escrow,
		manager,
		fileRegistry,
		keyRegistry,
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

const defaultPlacement = `0x${"ab".repeat(32)}` as Hex;
const defaultSenderEmail = `0x${"cd".repeat(32)}` as Hex;
const defaultSenderPrivy = `0x${"ef".repeat(32)}` as Hex;

/** Register file + approve + attach incentive for one signer commitment. */
export async function registerFileAndAttach(
	ctx: FullSystemFixture,
	pieceCid: string,
	signerCommitment: Hex,
	opts?: { fundAmount?: bigint; memoHash?: Hex },
): Promise<void> {
	const {
		manager,
		fileRegistry,
		mockUsdc,
		server,
		sender,
		escrow,
		chainId,
		fundAmount,
	} = ctx;
	const amount = opts?.fundAmount ?? fundAmount;
	const memo = opts?.memoHash ?? (`0x${"11".repeat(32)}` as Hex);
	const timestamp = await latestBlockTimestamp(ctx.publicClient);
	const nonce = await fileRegistry.read.nonce([walletAccount(sender).address]);
	const signersCommitment =
		await fileRegistry.read.computeEmailSignerCommitment([[signerCommitment]]);

	const regSig = await signRegisterFile({
		wallet: sender,
		fileRegistryAddress: fileRegistry.address,
		chainId,
		pieceCid,
		signersCommitment,
		placementCommitment: defaultPlacement,
		senderEmailCommitment: defaultSenderEmail,
		senderPrivySubjectCommitment: defaultSenderPrivy,
		timestamp,
		nonce,
	});

	await fileRegistry.write.registerFile(
		[
			pieceCid,
			walletAccount(sender).address,
			[signerCommitment],
			[],
			defaultSenderEmail,
			defaultSenderPrivy,
			timestamp,
			regSig,
			defaultPlacement,
		],
		{ account: walletAccount(server) },
	);

	await mockUsdc.write.approve([escrow.address, amount], {
		account: walletAccount(sender),
	});
	await manager.write.attachIncentive(
		[pieceCid, signerCommitment, mockUsdc.address, amount, memo],
		{ account: walletAccount(server) },
	);
}

/** Register file row only (no incentive). */
export async function registerFileOnly(
	ctx: FullSystemFixture,
	pieceCid: string,
	signerCommitments: Hex[],
): Promise<void> {
	const { fileRegistry, server, sender, chainId, publicClient } = ctx;
	const timestamp = await latestBlockTimestamp(publicClient);
	const nonce = await fileRegistry.read.nonce([walletAccount(sender).address]);
	const signersCommitment =
		await fileRegistry.read.computeEmailSignerCommitment([signerCommitments]);

	const regSig = await signRegisterFile({
		wallet: sender,
		fileRegistryAddress: fileRegistry.address,
		chainId,
		pieceCid,
		signersCommitment,
		placementCommitment: defaultPlacement,
		senderEmailCommitment: defaultSenderEmail,
		senderPrivySubjectCommitment: defaultSenderPrivy,
		timestamp,
		nonce,
	});

	await fileRegistry.write.registerFile(
		[
			pieceCid,
			walletAccount(sender).address,
			signerCommitments,
			[],
			defaultSenderEmail,
			defaultSenderPrivy,
			timestamp,
			regSig,
			defaultPlacement,
		],
		{ account: walletAccount(server) },
	);
}

/** Sorted `bytes32` commitments for multi-signer files (ascending). */
export function sortedCommitmentsHex(a: Hex, b: Hex): [Hex, Hex] {
	return a < b ? [a, b] : [b, a];
}

export async function registerFileAndAttachMulti(
	ctx: FullSystemFixture,
	pieceCid: string,
	signerCommitments: Hex[],
	opts?: { fundPerSigner?: bigint; memoHash?: Hex },
): Promise<void> {
	const fundPer = opts?.fundPerSigner ?? ctx.fundAmount;
	const memo = opts?.memoHash ?? (`0x${"11".repeat(32)}` as Hex);
	const {
		manager,
		fileRegistry,
		mockUsdc,
		server,
		sender,
		escrow,
		chainId,
		publicClient,
	} = ctx;

	const timestamp = await latestBlockTimestamp(publicClient);
	const nonce = await fileRegistry.read.nonce([walletAccount(sender).address]);
	const signersCommitment =
		await fileRegistry.read.computeEmailSignerCommitment([signerCommitments]);

	const regSig = await signRegisterFile({
		wallet: sender,
		fileRegistryAddress: fileRegistry.address,
		chainId,
		pieceCid,
		signersCommitment,
		placementCommitment: defaultPlacement,
		senderEmailCommitment: defaultSenderEmail,
		senderPrivySubjectCommitment: defaultSenderPrivy,
		timestamp,
		nonce,
	});

	await fileRegistry.write.registerFile(
		[
			pieceCid,
			walletAccount(sender).address,
			signerCommitments,
			[],
			defaultSenderEmail,
			defaultSenderPrivy,
			timestamp,
			regSig,
			defaultPlacement,
		],
		{ account: walletAccount(server) },
	);

	const total = fundPer * BigInt(signerCommitments.length);
	await mockUsdc.write.approve([escrow.address, total], {
		account: walletAccount(sender),
	});

	for (const c of signerCommitments) {
		await manager.write.attachIncentive(
			[pieceCid, c, mockUsdc.address, fundPer, memo],
			{ account: walletAccount(server) },
		);
	}
}

const signDefaults = {
	privy: `0x${"99".repeat(32)}` as Hex,
	dl3: `0x${"88".repeat(20)}` as Hex,
	root: `0x${"77".repeat(32)}` as Hex,
	leafVersion: 1,
};

/** One `registerFileSignature` call (not necessarily the last signer). */
export async function registerFileSignatureStep(args: {
	ctx: FullSystemFixture;
	pieceCid: string;
	senderAddr: `0x${string}`;
	signerWallet: WalletClient;
	signerEmailCommitment: Hex;
	allSignerEmailCommitments: Hex[];
	payoutWallets: `0x${string}`[];
}): Promise<void> {
	const {
		ctx,
		pieceCid,
		senderAddr,
		signerWallet,
		signerEmailCommitment,
		allSignerEmailCommitments,
		payoutWallets,
	} = args;
	const signTs = await latestBlockTimestamp(ctx.publicClient);
	const signNonce = await ctx.fileRegistry.read.nonce([
		walletAccount(signerWallet).address,
	]);
	const signSig = await signRegisterFileSignature({
		wallet: signerWallet,
		fileRegistryAddress: ctx.fileRegistry.address,
		chainId: ctx.chainId,
		pieceCid,
		sender: senderAddr,
		signerEmailCommitment,
		privySubjectCommitment: signDefaults.privy,
		dl3SignatureCommitment: signDefaults.dl3,
		completionsRoot: signDefaults.root,
		leafSchemaVersion: signDefaults.leafVersion,
		timestamp: signTs,
		nonce: signNonce,
	});
	await ctx.fileRegistry.write.registerFileSignature(
		[
			pieceCid,
			senderAddr,
			walletAccount(signerWallet).address,
			signerEmailCommitment,
			signDefaults.privy,
			signDefaults.dl3,
			signTs,
			signSig,
			allSignerEmailCommitments,
			payoutWallets,
			signDefaults.root,
			signDefaults.leafVersion,
		],
		{ account: walletAccount(ctx.server) },
	);
}
