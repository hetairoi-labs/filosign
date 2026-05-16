import { signatures, toBytes, toHex } from "@filosign/crypto-utils";
import { useQuery } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { filosignKeys } from "../../lib/query-keys";
import type { AppRouterClient } from "../../orpc/app-router-types";
import type { FilosignSession } from "../../orpc/create-orpc-client";
import { useCryptoSeed } from "./useCryptoSeed";

export type FilosignAuthed = {
	rpc: AppRouterClient;
	session: FilosignSession;
};

/**
 * Ensures a JWT is on the shared oRPC client before authenticated procedures run.
 * Not a plain RPC query — orchestrates wallet crypto + `auth.nonce` / `auth.verify`.
 */
export function useAuthedApi() {
	const { rpc, rpcQuery, session, wallet, wasm } = useFilosignContext();
	const { action: cryptoAction } = useCryptoSeed();

	return useQuery({
		queryKey: filosignKeys.authedApi(wallet?.account.address),
		queryFn: async (): Promise<FilosignAuthed> => {
			if (!wallet) {
				throw new Error("unreachable");
			}

			if (session.jwtExists) {
				session.ensureJwt();
				return { rpc, session };
			}

			await cryptoAction(async (seed: Uint8Array) => {
				const { nonce } = await rpcQuery.auth.nonce.call({
					address: wallet.account.address,
				});

				const dl3Keypair = await signatures.keyGen({
					dl: wasm.dilithium,
					seed,
				});

				const signature = await signatures.sign({
					dl: wasm.dilithium,
					privateKey: dl3Keypair.privateKey,
					message: toBytes(nonce),
				});

				const verify = await rpcQuery.auth.verify.call({
					address: wallet.account.address,
					signature: toHex(signature),
				});

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
