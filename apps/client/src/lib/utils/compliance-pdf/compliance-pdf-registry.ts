import {
	hashNormalizedSignerEmail,
	normalizePlacementRecipientEmail,
} from "@filosign/shared";
import { getAddress, zeroAddress } from "viem";
import type { SignerIncentiveForPdf } from "./compliance-pdf-types";

type RegistryRead = {
	cidIdentifier: (args: readonly [string]) => Promise<`0x${string}`>;
	getSignerIncentive: (
		args: readonly [`0x${string}`, `0x${string}`],
	) => Promise<readonly [`0x${string}`, bigint, boolean]>;
};

type Participant =
	| string
	| {
			wallet: string;
			name: string | null;
			email: string | null;
	  };

function participantWallet(p: Participant): string {
	return typeof p === "string" ? p : p.wallet;
}

/**
 * Load incentive rows for every signer (on-chain). Pass result as `signerIncentives`
 * on `CompliancePdfBundleOptions`.
 */
export async function fetchSignerIncentivesForCompliancePdf(
	registryRead: RegistryRead,
	pieceCid: string,
	signers: Participant[],
	tokenDisplay: (token: `0x${string}`) => { label: string; decimals: number },
): Promise<SignerIncentiveForPdf[]> {
	const cidId = await registryRead.cidIdentifier([pieceCid]);
	const result: SignerIncentiveForPdf[] = [];

	for (const s of signers) {
		const raw = participantWallet(s);
		let addr: `0x${string}`;
		try {
			addr = getAddress(raw) as `0x${string}`;
		} catch {
			result.push({
				address: raw,
				hasIncentive: false,
				amount: 0n,
				claimed: false,
				tokenLabel: "",
				decimals: 18,
			});
			continue;
		}

		const emailRaw =
			typeof s === "object" && s.email?.trim()
				? normalizePlacementRecipientEmail(s.email)
				: null;
		if (!emailRaw) {
			result.push({
				address: addr,
				hasIncentive: false,
				amount: 0n,
				claimed: false,
				tokenLabel: "",
				decimals: 18,
			});
			continue;
		}

		const signerCommitment = hashNormalizedSignerEmail(emailRaw);

		const [token, amount, claimed] = await registryRead.getSignerIncentive([
			cidId,
			signerCommitment,
		]);

		const noToken =
			!token ||
			token.toLowerCase() === zeroAddress.toLowerCase() ||
			amount === 0n;

		if (noToken) {
			result.push({
				address: addr,
				hasIncentive: false,
				amount: 0n,
				claimed: false,
				tokenLabel: "",
				decimals: 18,
			});
		} else {
			const t = token as `0x${string}`;
			const { label, decimals } = tokenDisplay(t);
			result.push({
				address: addr,
				hasIncentive: true,
				amount,
				claimed,
				tokenLabel: label,
				decimals,
			});
		}
	}

	return result;
}
