import assert from "node:assert/strict";
import { expect } from "chai";
import hre from "hardhat";
import { deployFullSystem } from "./fixtures.js";
import {
	COMMIT_DILITHIUM,
	COMMIT_KYBER,
	SALT_CHALLENGE,
	SALT_PIN,
	SALT_SEED,
	signRegisterKeygen,
} from "./helpers/signatures.js";
import { walletAccount } from "./helpers/walletAccount.js";

describe("FSKeyRegistry", () => {
	it("registerKeygenData stores commitments", async () => {
		const ctx = await deployFullSystem();
		const row = await ctx.keyRegistry.read.keygenData([
			walletAccount(ctx.sender).address,
		]);
		expect(row[3]).to.equal(COMMIT_KYBER);
		expect(row[4]).to.equal(COMMIT_DILITHIUM);
		expect(
			await ctx.keyRegistry.read.isRegistered([
				walletAccount(ctx.sender).address,
			]),
		).to.be.true;
	});

	it("reverts duplicate registration", async () => {
		const ctx = await deployFullSystem();
		const sig = await signRegisterKeygen(
			ctx.sender,
			ctx.keyRegistry.address,
			ctx.chainId,
		);
		await assert.rejects(
			ctx.keyRegistry.write.registerKeygenData(
				[
					SALT_PIN,
					SALT_SEED,
					SALT_CHALLENGE,
					COMMIT_KYBER,
					COMMIT_DILITHIUM,
					sig,
					walletAccount(ctx.sender).address,
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("reverts when salt_pin is zero", async () => {
		const ctx = await deployFullSystem();
		const clients = await hre.viem.getWalletClients();
		const fresh = clients[7];
		const sig = await signRegisterKeygen(
			fresh,
			ctx.keyRegistry.address,
			ctx.chainId,
		);
		await assert.rejects(
			ctx.keyRegistry.write.registerKeygenData(
				[
					`0x${"00".repeat(16)}` as `0x${string}`,
					SALT_SEED,
					SALT_CHALLENGE,
					COMMIT_KYBER,
					COMMIT_DILITHIUM,
					sig,
					walletAccount(fresh).address,
				],
				{ account: walletAccount(ctx.server) },
			),
		);
	});

	it("reverts when caller is not server", async () => {
		const ctx = await deployFullSystem();
		const clients = await hre.viem.getWalletClients();
		const fresh = clients[8];
		const sig = await signRegisterKeygen(
			fresh,
			ctx.keyRegistry.address,
			ctx.chainId,
		);
		await assert.rejects(
			ctx.keyRegistry.write.registerKeygenData(
				[
					SALT_PIN,
					SALT_SEED,
					SALT_CHALLENGE,
					COMMIT_KYBER,
					COMMIT_DILITHIUM,
					sig,
					walletAccount(fresh).address,
				],
				{ account: walletAccount(fresh) },
			),
		);
	});
});
