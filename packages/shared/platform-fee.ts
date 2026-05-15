/** Platform fee denominator (basis points). */
export const PLATFORM_FEE_BPS_DENOMINATOR = 10_000n;

/** Fee taken from gross incentive amount at settlement (floor rounding). */
export function computePlatformFee(
	grossAmount: bigint,
	feeBps: number,
): bigint {
	if (feeBps <= 0) return 0n;
	return (grossAmount * BigInt(feeBps)) / PLATFORM_FEE_BPS_DENOMINATOR;
}

/** Estimated USDC the signer receives after platform fee. */
export function computeSignerNetPayout(
	grossAmount: bigint,
	feeBps: number,
): bigint {
	return grossAmount - computePlatformFee(grossAmount, feeBps);
}
