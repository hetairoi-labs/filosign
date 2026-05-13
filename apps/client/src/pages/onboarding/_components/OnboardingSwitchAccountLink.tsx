import { useFilosignContext } from "@filosign/react";
import { useLogout } from "@filosign/react/hooks";
import { usePrivy } from "@privy-io/react-auth";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { useStorePersist } from "@/src/lib/hooks/use-store";
import { cn } from "@/src/lib/utils";
import { logger } from "@/src/lib/utils/logger";
import { safeAsync } from "@/src/lib/utils/safe";

export type ExecuteSwitchAccountLogoutArgs = {
	clearOnboardingForm: () => void;
	wallet: ReturnType<typeof useFilosignContext>["wallet"];
	logoutFilosign: ReturnType<typeof useLogout>;
	logoutPrivy: () => Promise<void>;
	navigate: ReturnType<typeof useNavigate>;
	/** When true, skip navigating home (stay on cold-invite URL, etc.). */
	stayAfterLogout: boolean;
	onStayAfterLogout?: () => void;
};

/** Clears onboarding draft, logs out Filosign + Privy; optionally stays on the current route. */
export async function executeSwitchAccountLogout(
	args: ExecuteSwitchAccountLogoutArgs,
): Promise<void> {
	args.clearOnboardingForm();
	if (args.wallet) {
		const [, err] = await safeAsync(() => args.logoutFilosign.mutateAsync());
		if (err) {
			logger.error("Filosign logout before switch account:", err);
		}
	}
	const [, privyErr] = await safeAsync(() => args.logoutPrivy());
	if (privyErr) {
		logger.error("Privy logout (switch account):", privyErr);
	}
	if (args.stayAfterLogout) {
		args.onStayAfterLogout?.();
	} else {
		await args.navigate({ to: "/" });
	}
}

export function OnboardingSwitchAccountLink({
	className,
	stayAfterLogout = false,
	onStayAfterLogout,
}: {
	className?: string;
	/** If true, do not navigate away after logout (e.g. cold-invite sign URL should show intro again). */
	stayAfterLogout?: boolean;
	onStayAfterLogout?: () => void;
}) {
	const { wallet } = useFilosignContext();
	const { logout: logoutPrivy } = usePrivy();
	const logoutFilosign = useLogout();
	const clearOnboardingForm = useStorePersist((s) => s.clearOnboardingForm);
	const navigate = useNavigate();
	const [pending, setPending] = useState(false);

	const handleClick = async () => {
		setPending(true);
		try {
			await executeSwitchAccountLogout({
				clearOnboardingForm,
				wallet,
				logoutFilosign,
				logoutPrivy,
				navigate,
				stayAfterLogout,
				onStayAfterLogout,
			});
		} finally {
			setPending(false);
		}
	};

	return (
		<div className={cn("flex mt-2 w-full justify-center pt-2", className)}>
			<Button
				type="button"
				variant="link"
				className="text-muted-foreground h-auto min-h-0 px-2 py-1 text-sm"
				disabled={pending}
				onClick={() => void handleClick()}
			>
				{pending ? "Switching…" : "Switch account"}
			</Button>
		</div>
	);
}
