import type { Hex } from "viem";
import { getAddress, isAddress, isHex } from "viem";
import z from "zod";

export const zHexString = () =>
	z
		.string()
		.refine(
			(val) => {
				return isHex(val);
			},
			{ error: "Invalid hex string" },
		)
		.transform((val) => val.toLowerCase() as Hex);

export const zEvmAddress = () =>
	z
		.string()
		.refine(
			(val) => {
				return isAddress(val);
			},
			{ error: "Invalid Ethereum address" },
		)
		.transform((val) => getAddress(val));

export const zJsonString = () =>
	z.string().refine(
		(val) => {
			try {
				JSON.parse(val);
				return true;
			} catch {
				return false;
			}
		},
		{ error: "Invalid JSON string" },
	);

export const zFileData = () =>
	z.object({
		bytesB64: z.string(),
		sender: zEvmAddress(),
		timestamp: z.number(),
		signers: z.array(
			z.object({
				address: zEvmAddress(),
				signaturePosition: zHexString(),
			}),
		),
		metadata: z.object({
			name: z.string(),
		}),
	});
