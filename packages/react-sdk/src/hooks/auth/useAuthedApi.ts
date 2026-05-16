import { signatures, toBytes, toHex } from "@filosign/crypto-utils";
import { zHexString } from "@filosign/shared/zod";
import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { useFilosignContext } from "../../context/useFilosignContext";
import type { AppRouterClient } from "../../orpc/app-router-types";
import type { FilosignSession } from "../../orpc/create-orpc-client";
import { useCryptoSeed } from "./useCryptoSeed";

export type FilosignAuthed = {
	rpc: AppRouterClient;
	session: FilosignSession;
};

export function useAuthedApi() {
	const { rpc, session, wallet, wasm } = useFilosignContext();
	const { action: cryptoAction } = useCryptoSeed();

	return useQuery({
		queryKey: ["fsQ-authed-api", wallet?.account.address],
		queryFn: async (): Promise<FilosignAuthed> => {
			if (!wallet) {
				throw new Error("unreachable");
			}

			if (session.jwtExists) {
				session.ensureJwt();
				return { rpc, session };
			}

			await cryptoAction(async (seed: Uint8Array) => {
				const { nonce } = z.object({ nonce: zHexString() }).parse(
					await rpc.auth.nonce({
						address: wallet.account.address,
					}),
				);

				const dl3Keypair = await signatures.keyGen({
					dl: wasm.dilithium,
					seed,
				});

				const signature = await signatures.sign({
					dl: wasm.dilithium,
					privateKey: dl3Keypair.privateKey,
					message: toBytes(nonce),
				});

				const verify = z
					.object({ valid: z.literal(true), token: z.string() })
					.or(z.object({ valid: z.literal(false) }))
					.parse(
						await rpc.auth.verify({
							address: wallet.account.address,
							signature: toHex(signature),
						}),
					);

				if (!verify.valid) {
					throw new Error("Authentication verification failed");
				}

				session.setJwt(verify.token);
			});

			session.ensureJwt();
			return { rpc, session };
		},
		enabled: !!wallet && !!wasm.dilithium,
	});
}
