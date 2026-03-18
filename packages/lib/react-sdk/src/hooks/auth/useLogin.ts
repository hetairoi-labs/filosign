import { eip712signature } from "@filosign/contracts";
import { toHex, walletKeyGen } from "@filosign/crypto-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { idb } from "../../../utils/idb";
import { useFilosignContext } from "../../context/FilosignProvider";
import { useIsLoggedIn } from "./useIsLoggedIn";
import { useIsRegistered } from "./useIsRegistered";

export function useLogin() {
	const { api, contracts, wallet, wasm } = useFilosignContext();
	const queryClient = useQueryClient();

	const { data: isRegistered } = useIsRegistered();
	const { data: isLoggedIn } = useIsLoggedIn();

	return useMutation({
		mutationFn: async (params: { pin: string }) => {
			if (isLoggedIn) return true;

			const { pin } = params;

			if (!contracts || !wallet || !wasm.dilithium) {
				throw new Error("unreachable");
			}

			const keyStore = idb({
				db: wallet.account.address,
				store: "fs-keystore",
			});

			if (!isRegistered) {
				console.log("registering..");

				const keygenData = await walletKeyGen(wallet, {
					pin,
					dl: wasm.dilithium,
				});

				const signature = await eip712signature(contracts, "FSKeyRegistry", {
					types: {
						RegisterKeygenData: [
							{ name: "salt_pin", type: "bytes16" },
							{ name: "salt_seed", type: "bytes16" },
							{ name: "salt_challenge", type: "bytes16" },
							{ name: "commitment_kyber_pk", type: "bytes20" },
							{ name: "commitment_dilithium_pk", type: "bytes20" },
						],
					},
					primaryType: "RegisterKeygenData",
					message: {
						salt_pin: keygenData.saltPin,
						salt_seed: keygenData.saltSeed,
						salt_challenge: keygenData.saltChallenge,
						commitment_kyber_pk: keygenData.commitmentKem,
						commitment_dilithium_pk: keygenData.commitmentSig,
					},
				});

				const requestPayload = {
					signature,
					saltPin: keygenData.saltPin,
					saltSeed: keygenData.saltSeed,
					saltChallenge: keygenData.saltChallenge,
					commitmentKem: keygenData.commitmentKem,
					commitmentSig: keygenData.commitmentSig,
					encryptionPublicKey: toHex(keygenData.kemKeypair.publicKey),
					signaturePublicKey: toHex(keygenData.sigKeypair.publicKey),
					walletAddress: wallet.account.address,
				};

				await api.rpc.postSafe({}, "/users/profile", requestPayload);
				console.log("keygen data registered");

				await keyStore.secret.put("key-seed", new Uint8Array(keygenData.seed));
			} else {
				console.log("logging in..");

				const [saltPin, saltSeed, saltChallenge, commitmentKem, commitmentSig] =
					await contracts.FSKeyRegistry.read.keygenData([
						wallet.account.address,
					]);

				const keygenData = await walletKeyGen(wallet, {
					pin,
					salts: {
						challenge: saltChallenge,
						seed: saltSeed,
						pin: saltPin,
					},
					dl: wasm.dilithium,
				});

				if (
					commitmentKem !== keygenData.commitmentKem ||
					commitmentSig !== keygenData.commitmentSig
				) {
					throw new Error("Invalid PIN");
				}

				await keyStore.secret.put("key-seed", new Uint8Array(keygenData.seed));
			}

			queryClient
				.refetchQueries({
					queryKey: ["fsQ-is-registered", wallet?.account.address],
				})
				.then(() =>
					queryClient
						.refetchQueries({
							queryKey: ["fsQ-stored-keygen-data", wallet?.account.address],
						})
						.then(() =>
							queryClient.refetchQueries({
								queryKey: ["fsQ-is-logged-in", wallet?.account.address],
							}),
						),
				);
			return true;
		},
	});
}
