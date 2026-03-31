import { useIsRegistered } from "@filosign/react/hooks";
import { SignOutIcon } from "@phosphor-icons/react";
import { usePrivy } from "@privy-io/react-auth";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/src/lib/components/ui/button";

export type ConnectButtonState =
	| "loading"
	| "signin"
	| "get-started"
	| "dashboard";

export function useConnectButtonLogic() {
	const { ready, authenticated, login: loginPrivy, logout } = usePrivy();
	const isRegistered = useIsRegistered();

	// Determine button state for smooth transitions.
	const getButtonState = (): ConnectButtonState => {
		if (!ready) return "loading";
		if (!authenticated || isRegistered.isPending) return "signin";
		if (!isRegistered.data) return "get-started";
		return "dashboard";
	};

	const buttonState = getButtonState();
	const isLoading = buttonState === "loading";

	const primaryCta =
		buttonState === "dashboard"
			? { label: "Dashboard", to: "/dashboard" }
			: buttonState === "get-started"
				? { label: "Get started", to: "/onboarding" }
				: null;

	return {
		ready,
		authenticated,
		isLoading,
		buttonState,
		primaryCta,
		signIn: () => loginPrivy(),
		logout: () => logout(),
	} as const;
}

export default function ConnectButton() {
	const { authenticated, isLoading, buttonState, primaryCta, signIn, logout } =
		useConnectButtonLogic();

	return (
		<motion.div
			className="flex items-center gap-2"
			initial={{ opacity: 0, x: 30 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{
				type: "spring",
				stiffness: 230,
				damping: 30,
				mass: 1.2,
				delay: 0.78,
			}}
		>
			{/* Sign In button - show when not authenticated or loading */}
			{(!authenticated || isLoading) && buttonState !== "dashboard" ? (
				<Button
					variant="secondary"
					onClick={
						buttonState === "signin" && !isLoading ? () => signIn() : undefined
					}
					disabled={isLoading}
					className="min-w-28"
				>
					<AnimatePresence mode="wait">
						<motion.span
							key={buttonState}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							transition={{
								duration: 0.2,
								ease: "easeInOut",
								layout: { duration: 0.3 },
							}}
							layout
						>
							Sign in
						</motion.span>
					</AnimatePresence>
				</Button>
			) : null}

			{/* Get started / Dashboard buttons */}
			{primaryCta ? (
				<Button variant="secondary" asChild className="min-w-28 mr-2">
					<Link to={primaryCta.to}>
						<AnimatePresence mode="wait">
							<motion.span
								key={primaryCta.to}
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -10 }}
								transition={{
									duration: 0.2,
									ease: "easeInOut",
									layout: { duration: 0.3 },
								}}
								layout
							>
								{primaryCta.label}
							</motion.span>
						</AnimatePresence>
					</Link>
				</Button>
			) : null}

			{/* Logout button - show when authenticated */}
			{authenticated && (
				<Button
					variant="secondary"
					size="icon"
					onClick={() => logout()}
					title="Logout"
				>
					<SignOutIcon className="h-5 w-5" />
				</Button>
			)}
		</motion.div>
	);
}
