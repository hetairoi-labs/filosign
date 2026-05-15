import { useLogin } from "@filosign/react/hooks";
import { useIdentityToken } from "@privy-io/react-auth";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function useOnboardingKeyRegistration() {
	const { identityToken } = useIdentityToken();
	const login = useLogin();
	const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);

	const registerKeys = useCallback(async () => {
		if (!identityToken) {
			toast.error(
				"Identity token not available. Enable identity tokens in the Privy dashboard, or try logging in again.",
			);
			return { ok: false as const };
		}
		try {
			const result = await login.mutateAsync({ idToken: identityToken });
			if (
				result &&
				typeof result === "object" &&
				"recoveryPhrase" in result &&
				typeof result.recoveryPhrase === "string"
			) {
				setRecoveryPhrase(result.recoveryPhrase);
				return { ok: true as const, hadPhrase: true };
			}
			setRecoveryPhrase(null);
			return { ok: true as const, hadPhrase: false };
		} catch {
			toast.error("Registration failed. Try again.");
			return { ok: false as const };
		}
	}, [identityToken, login]);

	const clearRecoveryPhrase = useCallback(() => {
		setRecoveryPhrase(null);
	}, []);

	return {
		registerKeys,
		isRegistering: login.isPending,
		recoveryPhrase,
		clearRecoveryPhrase,
	};
}
