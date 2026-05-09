import { useIsRegistered } from "@filosign/react/hooks";
import { usePrivy } from "@privy-io/react-auth";
import { Navigate } from "@tanstack/react-router";

export default function OnboardingProtector({
	children,
	allowRegistered = false,
}: {
	children: React.ReactNode;
	allowRegistered?: boolean;
}) {
	const { ready } = usePrivy();
	const isRegistered = useIsRegistered();

	if (!allowRegistered && ready && isRegistered.data) {
		return <Navigate to="/dashboard" replace />;
	}

	return <>{children}</>;
}
