import { useIsRegistered } from "@filosign/react/hooks";
import { usePrivy } from "@privy-io/react-auth";
import { Navigate } from "@tanstack/react-router";

export default function OnboardingProtector({
	children,
}: {
	children: React.ReactNode;
}) {
	const { ready } = usePrivy();
	const isRegistered = useIsRegistered();

	if (ready && isRegistered.data) {
		return <Navigate to="/dashboard" replace />;
	}

	return <>{children}</>;
}
