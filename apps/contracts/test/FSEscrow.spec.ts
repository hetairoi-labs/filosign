import assert from "node:assert/strict";
import { expect } from "chai";
import { parseUnits } from "viem";
import { BPS, deployEscrowOnly } from "./fixtures.js";
import { latestBlockTimestamp } from "./helpers/chainTime.js";
import { assertEscrowBalanced, assertFeeSplit } from "./helpers/invariants.js";
import { signMockUsdcPermit } from "./helpers/signatures.js";
import { walletAccount } from "./helpers/walletAccount.js";

describe("FSEscrow", () => {
	it("settleIncentiveRelease accrues platform revenue and debits liabilities", async () => {
		const {
			escrow,
			mockUsdc,
			server,
			sender,
			payout,
			publicClient,
			fundAmount,
		} = await deployEscrowOnly();

		await mockUsdc.write.approve([escrow.address, fundAmount], {
			account: walletAccount(sender),
		});
		await escrow.write.deposit(
			[mockUsdc.address, walletAccount(sender).address, fundAmount],
			{ account: walletAccount(server) },
		);

		const feeBps = 100n;
		const fee = (fundAmount * feeBps) / BPS;
		const net = fundAmount - fee;
		assertFeeSplit(fundAmount, feeBps, fee, net);

		await escrow.write.settleIncentiveRelease(
			[
				mockUsdc.address,
				walletAccount(sender).address,
				walletAccount(payout).address,
				fundAmount,
				Number(feeBps),
			],
			{ account: walletAccount(server) },
		);

		expect(
			await mockUsdc.read.balanceOf([walletAccount(payout).address]),
		).to.equal(net);
		expect(await escrow.read.platformRevenue([mockUsdc.address])).to.equal(fee);
		expect(await escrow.read.totalLiabilities([mockUsdc.address])).to.equal(0n);

		const accounted = await escrow.read.accountedAssets([mockUsdc.address]);
		const stray = await escrow.read.strayBalance([mockUsdc.address]);
		await assertEscrowBalanced(
			publicClient,
			escrow.address,
			mockUsdc.address,
			accounted,
			stray,
		);
	});

	it("reverts deposit from non-manager", async () => {
		const { escrow, mockUsdc, sender, fundAmount } = await deployEscrowOnly();

		await mockUsdc.write.approve([escrow.address, fundAmount], {
			account: walletAccount(sender),
		});
		await assert.rejects(
			escrow.write.deposit(
				[mockUsdc.address, walletAccount(sender).address, fundAmount],
				{ account: walletAccount(sender) },
			),
		);
	});

	it("reverts deposit when token not allowed", async () => {
		const { escrow, mockUsdc, server, sender, fundAmount } =
			await deployEscrowOnly();
		await escrow.write.setAllowedToken([mockUsdc.address, false], {
			account: walletAccount(server),
		});
		await mockUsdc.write.approve([escrow.address, fundAmount], {
			account: walletAccount(sender),
		});
		await assert.rejects(
			escrow.write.deposit(
				[mockUsdc.address, walletAccount(sender).address, fundAmount],
				{ account: walletAccount(server) },
			),
		);
	});

	it("reverts zero amount deposit", async () => {
		const { escrow, mockUsdc, server, sender } = await deployEscrowOnly();
		await mockUsdc.write.approve([escrow.address, 1n], {
			account: walletAccount(sender),
		});
		await assert.rejects(
			escrow.write.deposit(
				[mockUsdc.address, walletAccount(sender).address, 0n],
				{ account: walletAccount(server) },
			),
		);
	});

	it("reverts deposit when sender deposit-blacklisted", async () => {
		const { escrow, mockUsdc, server, sender, fundAmount } =
			await deployEscrowOnly();
		await escrow.write.setSenderDepositBlacklisted(
			[walletAccount(sender).address, true],
			{
				account: walletAccount(server),
			},
		);
		await mockUsdc.write.approve([escrow.address, fundAmount], {
			account: walletAccount(sender),
		});
		await assert.rejects(
			escrow.write.deposit(
				[mockUsdc.address, walletAccount(sender).address, fundAmount],
				{ account: walletAccount(server) },
			),
		);
	});

	it("reverts settle when payout blacklisted", async () => {
		const { escrow, mockUsdc, server, sender, payout, fundAmount } =
			await deployEscrowOnly();
		await escrow.write.setPayoutBlacklisted(
			[walletAccount(payout).address, true],
			{
				account: walletAccount(server),
			},
		);
		await mockUsdc.write.approve([escrow.address, fundAmount], {
			account: walletAccount(sender),
		});
		await escrow.write.deposit(
			[mockUsdc.address, walletAccount(sender).address, fundAmount],
			{ account: walletAccount(server) },
		);
		await assert.rejects(
			escrow.write.settleIncentiveRelease(
				[
					mockUsdc.address,
					walletAccount(sender).address,
					walletAccount(payout).address,
					fundAmount,
					100,
				],
				{ account: walletAccount(server) },
			),
		);
	});

	it("reverts deposit above default max when capped", async () => {
		const { escrow, mockUsdc, server, sender, fundAmount } =
			await deployEscrowOnly();
		const cap = parseUnits("50", 6);
		await escrow.write.setDefaultMaxDepositPerTx([cap], {
			account: walletAccount(server),
		});
		await mockUsdc.write.approve([escrow.address, fundAmount], {
			account: walletAccount(sender),
		});
		await assert.rejects(
			escrow.write.deposit(
				[mockUsdc.address, walletAccount(sender).address, fundAmount],
				{ account: walletAccount(server) },
			),
		);
	});

	it("reverts settle when gross exceeds deposited balance", async () => {
		const { escrow, mockUsdc, server, sender, payout, fundAmount } =
			await deployEscrowOnly();
		const half = fundAmount / 2n;
		await mockUsdc.write.approve([escrow.address, fundAmount], {
			account: walletAccount(sender),
		});
		await escrow.write.deposit(
			[mockUsdc.address, walletAccount(sender).address, half],
			{ account: walletAccount(server) },
		);
		await assert.rejects(
			escrow.write.settleIncentiveRelease(
				[
					mockUsdc.address,
					walletAccount(sender).address,
					walletAccount(payout).address,
					fundAmount,
					0,
				],
				{ account: walletAccount(server) },
			),
		);
	});

	it("reverts sweep beyond stray balance", async () => {
		const { escrow, mockUsdc, server, treasury } = await deployEscrowOnly();
		const stray = parseUnits("5", 6);
		await mockUsdc.write.mint([escrow.address, stray]);
		await assert.rejects(
			escrow.write.sweepStrayToken(
				[mockUsdc.address, walletAccount(treasury).address, stray + 1n],
				{ account: walletAccount(server) },
			),
		);
	});

	it("sweepStrayToken moves only unaccounted balance", async () => {
		const { escrow, mockUsdc, server, treasury } = await deployEscrowOnly();
		const stray = parseUnits("5", 6);
		await mockUsdc.write.mint([escrow.address, stray]);

		const before = await mockUsdc.read.balanceOf([
			walletAccount(treasury).address,
		]);
		await escrow.write.sweepStrayToken(
			[mockUsdc.address, walletAccount(treasury).address, stray],
			{ account: walletAccount(server) },
		);
		expect(
			await mockUsdc.read.balanceOf([walletAccount(treasury).address]),
		).to.equal(before + stray);
	});

	it("depositWithPermit credits same balance as deposit() for MockUSDC", async () => {
		const { escrow, mockUsdc, server, sender, publicClient, fundAmount } =
			await deployEscrowOnly();
		const chainId = await publicClient.getChainId();
		const deadline = (await latestBlockTimestamp(publicClient)) + 3600n;
		const nonce = await mockUsdc.read.nonces([walletAccount(sender).address]);
		const { v, r, s } = await signMockUsdcPermit({
			wallet: sender,
			tokenAddress: mockUsdc.address,
			chainId,
			owner: walletAccount(sender).address,
			spender: escrow.address,
			value: fundAmount,
			nonce,
			deadline,
		});

		await escrow.write.depositWithPermit(
			[
				mockUsdc.address,
				walletAccount(sender).address,
				fundAmount,
				deadline,
				v,
				r,
				s,
			],
			{ account: walletAccount(server) },
		);

		expect(
			await escrow.read.balances([
				walletAccount(sender).address,
				mockUsdc.address,
			]),
		).to.equal(fundAmount);
	});

	it("reverts withdrawPlatformRevenue when token not allowed", async () => {
		const { escrow, mockUsdc, server, sender, treasury, fundAmount } =
			await deployEscrowOnly();
		await mockUsdc.write.approve([escrow.address, fundAmount], {
			account: walletAccount(sender),
		});
		await escrow.write.deposit(
			[mockUsdc.address, walletAccount(sender).address, fundAmount],
			{ account: walletAccount(server) },
		);
		await escrow.write.settleIncentiveRelease(
			[
				mockUsdc.address,
				walletAccount(sender).address,
				walletAccount(treasury).address,
				fundAmount,
				1000,
			],
			{ account: walletAccount(server) },
		);
		const rev = await escrow.read.platformRevenue([mockUsdc.address]);
		await escrow.write.setAllowedToken([mockUsdc.address, false], {
			account: walletAccount(server),
		});
		await assert.rejects(
			escrow.write.withdrawPlatformRevenue(
				[mockUsdc.address, walletAccount(treasury).address, rev],
				{ account: walletAccount(server) },
			),
		);
	});
});
