import { eip712signature } from "@filosign/contracts";
import { toHex, walletKeyGen } from "@filosign/crypto-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { recoveryPhraseFromSeed } from "./recovery-phrase";
import { setSessionSeed } from "./session-seed";
import { unlockSeedFromWallet } from "./unlock-seed-from-wallet";
import { useIsLoggedIn } from "./useIsLoggedIn";
import { useIsRegistered } from "./useIsRegistered";

export const LOGIN_RECOVERY_PHRASE_REQUIRED = "RECOVERY_PHRASE_REQUIRED";

export interface LoginParams {
	idToken?: string;
	/** @internal For dev testing only - skips token authentication */
	skipToken?: boolean;
}

export function useLogin() {
	const { rpc, contracts, wallet, wasm } = useFilosignContext();
	const queryClient = useQueryClient();

	const { data: isRegistered } = useIsRegistered();
	const { data: isLoggedIn } = useIsLoggedIn();

	return useMutation({
		mutationFn: async (params: LoginParams) => {
			if (isLoggedIn) return { success: true };

			if (!contracts || !wallet || !wasm.dilithium) {
				throw new Error("unreachable");
			}

			let recoveryPhrase: string | undefined;

			if (!isRegistered) {
				const { idToken, skipToken } = params;
				if (!idToken && !skipToken) {
					throw new Error(
						"Authentication token required. Please ensure you are logged in with Privy.",
					);
				}

				const keygenData = await walletKeyGen(wallet, {
					dl: wasm.dilithium,
				});

				const walletAddress = wallet.account.address;
				const signature = await eip712signature(contracts, "FSKeyRegistry", {
					types: {
						RegisterKeygenData: [
							{ name: "from", type: "address" },
							{ name: "salt_pin", type: "bytes16" },
							{ name: "salt_seed", type: "bytes16" },
							{ name: "salt_challenge", type: "bytes16" },
							{ name: "commitment_kyber_pk", type: "bytes20" },
							{ name: "commitment_dilithium_pk", type: "bytes20" },
						],
					},
					primaryType: "RegisterKeygenData",
					message: {
						from: walletAddress,
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
					idToken,
					skipToken,
				};

				await rpc.users.register(requestPayload);

				setSessionSeed(wallet.account.address, keygenData.seed);
				recoveryPhrase = recoveryPhraseFromSeed(keygenData.seedCore32);

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
			} else {
				const seedFromWallet = await unlockSeedFromWallet({
					wallet,
					contracts,
					wasm,
				});

				if (seedFromWallet) {
					setSessionSeed(wallet.account.address, seedFromWallet);
				} else {
					throw new Error(LOGIN_RECOVERY_PHRASE_REQUIRED);
				}
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
			void queryClient.invalidateQueries({ queryKey: ["user"] });
			return recoveryPhrase
				? { success: true, recoveryPhrase }
				: { success: true };
		},
	});
}
