import { expect } from "chai";
import type { Address, PublicClient } from "viem";

/** Matches FSEscrow `settleIncentiveRelease` fee via `Math.mulDiv(gross, feeBps, 10_000)`. */
export function assertFeeSplit(
	gross: bigint,
	feeBps: bigint,
	fee: bigint,
	net: bigint,
): void {
	const denom = 10_000n;
	const expectedFee = (gross * feeBps) / denom;
	expect(fee).to.equal(expectedFee);
	expect(net).to.equal(gross - fee);
	expect(fee + net).to.equal(gross);
}

/** Vault ERC-20 balance equals accounted + stray (FSEscrow view definitions). */
export async function assertEscrowBalanced(
	publicClient: PublicClient,
	escrowAddress: Address,
	token: Address,
	accountedAssets: bigint,
	strayBalance: bigint,
): Promise<void> {
	const balance = await publicClient.readContract({
		address: token,
		abi: [
			{
				type: "function",
				name: "balanceOf",
				state: "view",
				inputs: [{ name: "a", type: "address" }],
				outputs: [{ type: "uint256" }],
			},
		],
		functionName: "balanceOf",
		args: [escrowAddress],
	});
	expect(balance).to.equal(accountedAssets + strayBalance);
}
