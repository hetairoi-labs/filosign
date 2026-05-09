import { signatures, toBytes, toHex } from "@filosign/crypto-utils";
import { zHexString } from "@filosign/shared/zod";
import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { useFilosignContext } from "../../context/FilosignProvider";
import { useCryptoSeed } from "./useCryptoSeed";

export function useAuthedApi() {
	const { api, wallet, wasm } = useFilosignContext();
	const { action: cryptoAction } = useCryptoSeed();

	return useQuery({
		queryKey: ["fsQ-authed-api", api.rpc, wallet?.account.address],
		queryFn: async () => {
			if (!api || !wallet) {
				throw new Error("unreachable");
			}

			if (api.jwtExists) {
				api.ensureJwt();
				return api;
			}

			await cryptoAction(async (seed: Uint8Array) => {
				const {
					data: { nonce },
				} = await api.rpc.getSafe(
					{
						nonce: zHexString(),
					},
					`/auth/nonce?address=${wallet.account.address}`,
				);

				const dl3Keypair = await signatures.keyGen({
					dl: wasm.dilithium,
					seed: seed,
				});

				const signature = await signatures.sign({
					dl: wasm.dilithium,
					privateKey: dl3Keypair.privateKey,
					message: toBytes(nonce),
				});

				const {
					data: { token },
				} = await api.rpc.postSafe(
					{
						token: z.string(),
					},
					`/auth/verify`,
					{
						address: wallet.account.address,
						signature: toHex(signature),
					},
				);

				api.setJwt(token);
			});

			api.ensureJwt();

			return api;
		},
		enabled: !!wallet && !!api,
	});
}
