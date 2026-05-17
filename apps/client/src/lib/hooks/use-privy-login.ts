import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
	useIdentifyAnalyticsWallet,
} from "@filosign/react/analytics";
import { useLogin } from "@privy-io/react-auth";
import { useMemo } from "react";

type PrivyUseLoginOptions = NonNullable<Parameters<typeof useLogin>[0]>;

/** Privy `login()` with PostHog `wallet_signup` on first-time account creation. */
export function usePrivyLogin(options?: PrivyUseLoginOptions) {
	const captureAppEvent = useCaptureAppEvent();
	const identifyAnalyticsWallet = useIdentifyAnalyticsWallet();

	return useLogin({
		...options,
		onComplete: (params) => {
			const { user, isNewUser, wasAlreadyAuthenticated, loginMethod } = params;
			if (isNewUser && !wasAlreadyAuthenticated) {
				captureAppEvent(CLIENT_ANALYTICS_EVENTS.walletSignup, {
					...(loginMethod ? { login_method: loginMethod } : {}),
				});
				const wallet = user.wallet?.address;
				if (wallet) {
					identifyAnalyticsWallet(wallet);
				}
			}
			options?.onComplete?.(params);
		},
	});
}

/** Stable `login` fn for effects that should not re-run when the hook identity changes. */
export function usePrivyLoginAction(options?: PrivyUseLoginOptions) {
	const { login } = usePrivyLogin(options);
	return useMemo(() => login, [login]);
}
