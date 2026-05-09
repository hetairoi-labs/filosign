import { eip712signature } from "@filosign/contracts";
import {
	seedKeyGen,
	signatures,
	toBytes,
	toHex,
	walletKeyGen,
} from "@filosign/crypto-utils";
import { zHexString } from "@filosign/shared/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import z from "zod";
import { useFilosignContext } from "../../context/useFilosignContext";
import {
	assertAttemptAllowed,
	decryptSeedWithPin,
	encryptSeedWithPin,
	loadAttempts,
	loadEnvelope,
	recoveryPhraseFromSeed,
	registerFailedAttempt,
	resetAttempts,
	saveEnvelope,
	validatePin,
} from "./pin-storage";
import { setSessionSeed } from "./session-seed";
import { useIsLoggedIn } from "./useIsLoggedIn";
import { useIsRegistered } from "./useIsRegistered";
import { useSessionStore } from "./useSessionStore";

export function useLogin() {
	const { api, contracts, wallet, wasm } = useFilosignContext();
	const queryClient = useQueryClient();
	const sessionStore = useSessionStore();

	const { data: isRegistered } = useIsRegistered();
	const { data: isLoggedIn } = useIsLoggedIn();

	return useMutation({
		mutationFn: async (params: { pin: string; rememberMe?: boolean }) => {
			if (isLoggedIn) return { success: true };

			const { pin, rememberMe = false } = params;

			if (!contracts || !wallet || !wasm.dilithium) {
				throw new Error("unreachable");
			}

			if (!validatePin(pin)) {
				throw new Error("PIN must be 6-10 digits");
			}

			let seedToStore: Uint8Array | undefined;
			let recoveryPhrase: string | undefined;

			const ensureJwtForSession = async (seed: Uint8Array) => {
				if (api.jwtExists) return;

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
					seed,
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
					"/auth/verify",
					{
						address: wallet.account.address,
						signature: toHex(signature),
					},
				);

				api.setJwt(token);
			};

			if (!isRegistered) {
				const keygenData = await walletKeyGen(wallet, {
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

				const envelope = await encryptSeedWithPin(pin, keygenData.seed);
				await saveEnvelope({ wallet: wallet.account.address, envelope });
				await resetAttempts({ wallet: wallet.account.address });
				setSessionSeed(wallet.account.address, keygenData.seed);
				seedToStore = keygenData.seed;
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
				const attempts = await loadAttempts({ wallet: wallet.account.address });
				assertAttemptAllowed(attempts);

				const [saltPin, saltSeed, saltChallenge, commitmentKem, commitmentSig] =
					await contracts.FSKeyRegistry.read.keygenData([
						wallet.account.address,
					]);

				const envelope = await loadEnvelope({ wallet: wallet.account.address });
				if (!envelope) {
					throw new Error("Unable to unlock");
				}
				let decryptedSeed: Uint8Array;
				try {
					decryptedSeed = await decryptSeedWithPin(pin, envelope);
					const keygenData = await seedKeyGen(
						new Uint8Array(Array.from(decryptedSeed)),
						{
							dl: wasm.dilithium,
						},
					);
					if (
						commitmentKem !== keygenData.commitmentKem ||
						commitmentSig !== keygenData.commitmentSig
					) {
						throw new Error("Unable to unlock");
					}
				} catch (_error) {
					await registerFailedAttempt({ wallet: wallet.account.address });
					throw new Error("Unable to unlock");
				}
				await resetAttempts({ wallet: wallet.account.address });
				setSessionSeed(wallet.account.address, decryptedSeed);
				seedToStore = decryptedSeed;

				// keep chain salts active through v1 registry schema
				void saltPin;
				void saltSeed;
				void saltChallenge;
			}

			// Store session server-side if rememberMe is enabled
			if (rememberMe && seedToStore) {
				try {
					await ensureJwtForSession(seedToStore);
					await sessionStore.mutateAsync({
						seed: seedToStore,
						expiresInHours: 24,
					});
				} catch {
					// Don't fail login if session storage fails
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
			return recoveryPhrase
				? { success: true, recoveryPhrase }
				: { success: true };
		},
	});
}
